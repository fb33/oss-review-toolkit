/*
 * Copyright (C) 2021 Bosch.IO GmbH
 * Copyright (C) 2021 HERE Europe B.V.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 * License-Filename: LICENSE
 */

package org.ossreviewtoolkit.advisor.advisors

import com.github.tomakehurst.wiremock.WireMockServer
import com.github.tomakehurst.wiremock.client.WireMock
import com.github.tomakehurst.wiremock.client.WireMock.aResponse
import com.github.tomakehurst.wiremock.client.WireMock.equalTo
import com.github.tomakehurst.wiremock.client.WireMock.equalToJson
import com.github.tomakehurst.wiremock.client.WireMock.get
import com.github.tomakehurst.wiremock.client.WireMock.post
import com.github.tomakehurst.wiremock.client.WireMock.stubFor
import com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo
import com.github.tomakehurst.wiremock.core.WireMockConfiguration

import io.kotest.core.spec.style.WordSpec
import io.kotest.matchers.collections.beEmpty
import io.kotest.matchers.collections.containExactly
import io.kotest.matchers.collections.containExactlyInAnyOrder
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.maps.shouldNotBeEmpty
import io.kotest.matchers.should
import io.kotest.matchers.shouldBe

import java.io.File
import java.net.URI

import kotlinx.coroutines.runBlocking

import org.ossreviewtoolkit.model.Identifier
import org.ossreviewtoolkit.model.OrtResult
import org.ossreviewtoolkit.model.Severity
import org.ossreviewtoolkit.model.Vulnerability
import org.ossreviewtoolkit.model.config.VulnerableCodeConfiguration
import org.ossreviewtoolkit.model.readValue
import org.ossreviewtoolkit.model.utils.toPurl
import org.ossreviewtoolkit.utils.test.shouldNotBeNull

class VulnerableCodeTest : WordSpec({
    val wiremock = WireMockServer(
        WireMockConfiguration.options()
            .dynamicPort()
            .usingFilesUnderDirectory(TEST_FILES_ROOT)
    )

    beforeSpec {
        wiremock.start()
        WireMock.configureFor(wiremock.port())
    }

    afterSpec {
        wiremock.stop()
    }

    beforeTest {
        wiremock.resetAll()
    }

    "VulnerableCode" should {
        "return vulnerability information" {
            stubFor(
                post(urlPathEqualTo("/api/packages/bulk_search"))
                    .withRequestBody(equalToJson(packagesRequestJson, false, false))
                    .withHeader("Content-Type", equalTo("application/json; charset=UTF-8"))
                    .willReturn(
                        aResponse().withStatus(200)
                            .withBodyFile("response_packages.json")
                    )
            )

            stubVulnerability("v1", "CVE-2014-8242", 42.0f)
            stubVulnerability("v2", "CVE-2009-1382", 11.0f)
            stubVulnerability("v3", "CVE-2019-CoV19", 77.0f)

            val vulnerableCode = createVulnerableCode(wiremock)
            val packagesToAdvise = resultFile().readValue<OrtResult>().getPackages(false).map { it.pkg }

            val result = vulnerableCode.retrievePackageVulnerabilities(packagesToAdvise).mapKeys { it.key.id }

            result.shouldNotBeEmpty()
            result.keys should containExactlyInAnyOrder(idLang, idStruts)

            val langResults = result.getValue(idLang)
            langResults shouldHaveSize(1)
            langResults[0].advisor.name shouldBe ADVISOR_NAME
            val expLangVulnerability = Vulnerability(
                id = "CVE-2014-8242",
                severity = 42.0f,
                url = URI("http://localhost:8000/api/vulnerabilities/v1/")
            )
            langResults.flatMap { it.vulnerabilities } should containExactly(expLangVulnerability)

            val strutsResults = result.getValue(idStruts)
            strutsResults shouldHaveSize(1)
            val expStrutsVulnerabilities = listOf(
                Vulnerability(
                    id = "CVE-2009-1382",
                    url = URI("http://localhost:8000/api/vulnerabilities/v2/"),
                    severity = 11.0f
                ),
                Vulnerability(
                    id = "CVE-2019-CoV19",
                    severity = 77.0f,
                    url = URI("http://localhost:8000/api/vulnerabilities/v3/")
                )
            )
            strutsResults.flatMap { it.vulnerabilities } should containExactlyInAnyOrder(expStrutsVulnerabilities)
        }

        "handle missing details of a vulnerability" {
            stubFor(
                post(urlPathEqualTo("/api/packages/bulk_search"))
                    .withRequestBody(equalToJson(packagesRequestJson, false, false))
                    .withHeader("Content-Type", equalTo("application/json; charset=UTF-8"))
                    .willReturn(
                        aResponse().withStatus(200)
                            .withBodyFile("response_packages.json")
                    )
            )

            stubVulnerability("v1", "CVE-2014-8242", 42.0f)
            stubVulnerability("v2", "CVE-2009-1382", 11.0f)
            stubFor(
                get(urlPathEqualTo("/api/vulnerabilities/v3"))
                    .willReturn(
                        aResponse().withStatus(200)
                            .withBodyFile("response_vulnerability_incomplete.json")
                    )
            )

            val vulnerableCode = createVulnerableCode(wiremock)
            val packagesToAdvise = resultFile().readValue<OrtResult>().getPackages(false).map { it.pkg }

            vulnerableCode.retrievePackageVulnerabilities(packagesToAdvise).mapKeys { it.key.id } shouldNotBeNull {
                val strutsResults = getValue(idStruts)
                val expStrutsVulnerabilities = listOf(
                    Vulnerability(
                        id = "CVE-2009-1382",
                        url = URI("http://localhost:8000/api/vulnerabilities/v2/"),
                        severity = 11.0f
                    ),
                    Vulnerability(
                        id = "",
                        severity = -1f,
                        url = URI("http://localhost:8000/api/vulnerabilities/v3/")
                    )
                )
                strutsResults.flatMap { it.vulnerabilities } should containExactlyInAnyOrder(expStrutsVulnerabilities)
            }
        }

        "return failures if a vulnerability cannot be resolved" {
            stubFor(
                post(urlPathEqualTo("/api/packages/bulk_search/"))
                    .withRequestBody(equalToJson(packagesRequestJson, false, false))
                    .withHeader("Content-Type", equalTo("application/json; charset=UTF-8"))
                    .willReturn(
                        aResponse().withStatus(200)
                            .withBodyFile("response_packages.json")
                    )
            )

            stubVulnerability("v1", "CVE-2014-8242", 42.0f)
            stubVulnerability("v2", "CVE-2009-1382", 11.0f)
            stubVulnerability("v3", "CVE-2019-CoV19", 77.0f, statusCode = 500)

            expectErrorResult(wiremock)
        }

        "detect an invalid vulnerability URL" {
            stubFor(
                post(urlPathEqualTo("/api/packages/bulk_search/"))
                    .withRequestBody(equalToJson(packagesRequestJson, false, false))
                    .withHeader("Content-Type", equalTo("application/json; charset=UTF-8"))
                    .willReturn(
                        aResponse().withStatus(200)
                            .withBodyFile("response_packages_invalid_vulnerability_url.json")
                    )
            )

            expectErrorResult(wiremock)
        }
    }
})

private const val ADVISOR_NAME = "VulnerableCodeTestAdvisor"
private const val TEST_FILES_ROOT = "src/test/assets/"
private const val TEST_RESULT_NAME = "ort-analyzer-result.yml"
private const val VULNERABILITY_TEMPLATE = "response_vulnerability.json.template"

private val idLang = Identifier("Maven:org.apache.commons:commons-lang3:3.5")
private val idText = Identifier("Maven:org.apache.commons:commons-text:1.1")
private val idStruts = Identifier("Maven:org.apache.struts:struts2-assembly:2.5.14.1")
private val idJUnit = Identifier("Maven:junit:junit:4.12")
private val idHamcrest = Identifier("Maven:org.hamcrest:hamcrest-core:1.3")

/**
 * The list with the identifiers of packages that are referenced in the test result file.
 */
private val packageIdentifiers = listOf(idJUnit, idLang, idText, idStruts, idHamcrest)

/**
 * The list of packages referenced by the test result. These packages should be requested by the vulnerability provider.
 */
private val packages = packageIdentifiers.map { it.toPurl() }

/**
 * The JSON request to query the test packages found in the result.
 */
private val packagesRequestJson = generateListRequest(packages, "packages")

/**
 * The text of the template to generate the details of a specific vulnerability. The template contains placeholders
 * for some IDs to be replaced dynamically.
 */
private val vulnerabilityDetailsTemplate = File(TEST_FILES_ROOT).resolve(VULNERABILITY_TEMPLATE).readText()

/**
 * Run a test with the VulnerabilityCode provider against the given [test server][wiremock] and expect the
 * operation to fail. In this case, for all packages a result with an error issue should have been created.
 */
private fun expectErrorResult(wiremock: WireMockServer) {
    val vulnerableCode = createVulnerableCode(wiremock)
    val packagesToAdvise = resultFile().readValue<OrtResult>().getPackages(false).map { it.pkg }

    val result = runBlocking {
        vulnerableCode.retrievePackageVulnerabilities(packagesToAdvise).mapKeys { it.key.id }
    }

    result shouldNotBeNull {
        keys should containExactly(packageIdentifiers)

        packageIdentifiers.forEach { pkg ->
            val pkgResults = getValue(pkg)
            pkgResults shouldHaveSize 1
            val pkgResult = pkgResults[0]
            pkgResult.vulnerabilities should beEmpty()
            pkgResult.summary.issues shouldHaveSize 1
            val issue = pkgResult.summary.issues[0]
            issue.severity shouldBe Severity.ERROR
        }
    }
}

/**
 * Create a configuration for the [VulnerableCode] vulnerability provider that points to the local [wireMockServer].
 */
private fun createConfig(wireMockServer: WireMockServer): VulnerableCodeConfiguration {
    val url = "http://localhost:${wireMockServer.port()}"
    return VulnerableCodeConfiguration(url)
}

/**
 * Create a test instance of [VulnerableCode] that communicates with the local [wireMockServer].
 */
private fun createVulnerableCode(wireMockServer: WireMockServer): VulnerableCode =
    VulnerableCode(ADVISOR_NAME, createConfig(wireMockServer))

/**
 * Return the test file with an analyzer result.
 */
private fun resultFile(): File = File(TEST_FILES_ROOT).resolve(TEST_RESULT_NAME)

/**
 * Generate the JSON body of the request for a list of [items] using the given [label]. This is used for both
 * the request for packages and vulnerabilities.
 */
private fun generateListRequest(items: List<String>, label: String): String =
    items.joinToString(prefix = "{ \"$label\": [", postfix = "] }") { "\"$it\"" }

/**
 * Generate a JSON string with details about a vulnerability with the given [id], [cveId], and [score].
 */
private fun vulnerabilityDetails(id: String, cveId: String, score: Float): String =
    vulnerabilityDetailsTemplate.replace("<<id>>", id)
        .replace("<<cve>>", cveId)
        .replace("<<score>>", score.toString())

/**
 * Stub a GET request for the details of the vulnerability with the given [id]. The request returns a JSON
 * containing the given [cveId] and [score] with the specified [statusCode].
 */
private fun stubVulnerability(id: String, cveId: String, score: Float, statusCode: Int = 200) {
    stubFor(
        get(urlPathEqualTo("/api/vulnerabilities/$id"))
            .willReturn(
                aResponse().withStatus(statusCode)
                    .withBody(vulnerabilityDetails(id, cveId, score))
            )
    )
}
