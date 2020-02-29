/*
 * Copyright (C) 2019-2020 HERE Europe B.V.
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

import Statistics from './Statistics';
import WebAppCopyright from './WebAppCopyright';
import WebAppLicense from './WebAppLicense';
import WebAppOrtIssue from './WebAppOrtIssue';
import WebAppPackage from './WebAppPackage';
import WebAppPath from './WebAppPath';
import WebAppPathExclude from './WebAppPathExclude';
import WebAppScanResult from './WebAppScanResult';
import WebAppScope from './WebAppScope';
import WebAppScopeExclude from './WebAppScopeExclude';
import WebAppTreeNode from './WebAppTreeNode';
import WebAppRuleViolation from './WebAppRuleViolation';

class WebAppOrtResult {
    #copyrights = [];

    #customData = {};

    #declaredLicenses = [];

    #declaredLicenseStats = {};

    #dependencyTrees = [];

    #treeNodesByPackageIndex;

    #detectedLicenses = [];

    #detectedLicenseStats = {};

    #issues = [];

    #issuesByPackageIndexMap = new Map();

    #issueResolutions = [];

    #levels = [];

    #licenses = [];

    #licensesIndexesByNameMap = new Map();

    #packages = [];

    #packageIndexesByPackageNameMap = new Map();

    #pathExcludes = [];

    #paths = [];

    #projects = [];

    #scanResults = [];

    #scopes = [];

    #scopeExcludes = [];

    #statistics = {};

    #repositoryConfiguration;

    #ruleViolations = [];

    #ruleViolationsByPackageIndexMap = new Map();

    #ruleViolationResolutions = [];

    constructor(obj) {
        if (obj instanceof Object) {
            if (obj.copyrights) {
                for (let i = 0, len = obj.copyrights.length; i < len; i++) {
                    this.#copyrights.push(new WebAppCopyright(obj.copyrights[i]));
                }
            }

            if (obj.custom_data || obj.customData) {
                this.#customData = obj.custom_data || obj.customData;
            }

            if (obj.declared_license_stats || obj.declaredLicenseStats) {
                this.#declaredLicenseStats = obj.declared_license_stats || obj.declaredLicenseStats;
                this.#declaredLicenses = Object.keys(this.#declaredLicenseStats);
            }

            if (obj.dependency_trees || obj.dependencyTrees) {
                const dependencyTrees = obj.dependency_trees || obj.dependencyTrees;
                const treeNodesByPackageIndex = {};
                const callback = (packageIndex, key, parentKey) => {
                    if (!treeNodesByPackageIndex[packageIndex]) {
                        treeNodesByPackageIndex[packageIndex] = {
                            keys: new Set([key]),
                            parentKeys: new Set([parentKey])
                        };
                    } else {
                        treeNodesByPackageIndex[packageIndex].keys.add(key);
                        treeNodesByPackageIndex[packageIndex].parentKeys.add(parentKey);
                    }
                };

                for (let i = 0, len = dependencyTrees.length; i < len; i++) {
                    this.#dependencyTrees.push(
                        new WebAppTreeNode(
                            dependencyTrees[i],
                            callback
                        )
                    );
                }

                this.#treeNodesByPackageIndex = treeNodesByPackageIndex;
            }

            if (obj.detected_license_stats || obj.detectedLicenseStats) {
                this.#detectedLicenseStats = obj.detected_license_stats || obj.detectedLicenseStats;
                this.#detectedLicenses = Object.keys(this.#detectedLicenseStats);
            }

            if (obj.licenses) {
                const { licenses } = obj;
                this.#licensesIndexesByNameMap.clear();

                for (let i = 0, len = licenses.length; i < len; i++) {
                    this.#licensesIndexesByNameMap.set(licenses[i].id, i);
                    this.#licenses.push(new WebAppLicense(licenses[i]));
                }
            }

            if (obj.packages) {
                const { packages } = obj;
                for (let i = 0, len = packages.length; i < len; i++) {
                    const webAppPackage = new WebAppPackage(packages[i], this);
                    this.#packages.push(webAppPackage);

                    if (webAppPackage.isProject) {
                        this.#projects.push(webAppPackage);
                    }
                }
            }

            if (obj.path_excludes || obj.pathExcludes) {
                const pathExcludes = obj.path_excludes || obj.pathExcludes;

                for (let i = 0, len = pathExcludes.length; i < len; i++) {
                    this.#pathExcludes.push(new WebAppPathExclude(pathExcludes[i]));
                }
            }

            if (obj.paths) {
                const { paths } = obj;
                for (let i = 0, len = paths.length; i < len; i++) {
                    this.#paths.push(new WebAppPath(paths[i], this));
                }
            }

            if (obj.scan_results || obj.scanResults) {
                const scanResults = obj.scan_results || obj.scanResults;

                for (let i = 0, len = scanResults.length; i < len; i++) {
                    this.#scanResults.push(new WebAppScanResult(scanResults[i]));
                }
            }

            if (obj.scopes) {
                const { scopes } = obj;
                for (let i = 0, len = scopes.length; i < len; i++) {
                    this.#scopes.push(new WebAppScope(scopes[i]));
                }
            }

            if (obj.statistics) {
                const { statistics } = obj;
                this.#statistics = new Statistics(statistics);
                const { dependencyTree: { totalTreeDepth } } = this.#statistics;

                if (totalTreeDepth) {
                    for (let i = 0, len = totalTreeDepth; i < len; i++) {
                        this.#levels.push(i);
                    }
                }
            }

            if (obj.scope_excludes || obj.scopeExcludes) {
                const scopeExcludes = obj.scope_excludes || obj.scopeExcludes;
                for (let i = 0, len = scopeExcludes.length; i < len; i++) {
                    this.#scopeExcludes.push(new WebAppScopeExclude(scopeExcludes[i]));
                }
            }

            if (obj.repository_configuration || obj.repositoryConfiguration) {
                this.#repositoryConfiguration = obj.repository_configuration
                    || obj.repositoryConfiguration;
            }

            if (obj.issues) {
                this.#issuesByPackageIndexMap.clear();

                for (let i = 0, len = obj.issues.length; i < len; i++) {
                    const issue = new WebAppOrtIssue(obj.issues[i], this);
                    const { packageIndex } = issue;
                    this.#issues.push(issue);

                    if (!this.#issuesByPackageIndexMap.has(packageIndex)) {
                        this.#issuesByPackageIndexMap.set(packageIndex, [issue]);
                    } else {
                        const packageIndexIssues = this.#issuesByPackageIndexMap.get(packageIndex);
                        packageIndexIssues.push(issue);
                        this.#issuesByPackageIndexMap.set(packageIndex, packageIndexIssues);
                    }
                }
            }

            if (obj.issue_resolutions || obj.issueResolutions) {
                this.#issueResolutions = obj.issue_resolutions
                    || obj.issueResolutions;
            }

            if (obj.rule_violations || obj.ruleViolations) {
                const ruleViolations = obj.rule_violations
                    || obj.ruleViolations;
                this.#ruleViolationsByPackageIndexMap.clear();

                for (let i = 0, len = ruleViolations.length; i < len; i++) {
                    const violation = new WebAppRuleViolation(ruleViolations[i], this);
                    const { packageIndex } = violation;
                    this.#ruleViolations.push(violation);

                    if (!this.#ruleViolationsByPackageIndexMap.has(packageIndex)) {
                        this.#ruleViolationsByPackageIndexMap.set(packageIndex, [violation]);
                    } else {
                        const packageIndexViolations = this.#ruleViolationsByPackageIndexMap.get(packageIndex);
                        packageIndexViolations.push(violation);
                        this.#ruleViolationsByPackageIndexMap.set(packageIndex, packageIndexViolations);
                    }
                }
            }

            if (obj.rule_violation_resolutions || obj.ruleViolationResolutions) {
                this.#ruleViolationResolutions = obj.rule_violation_resolutions
                    || obj.ruleViolationResolutions;
            }
        }
    }

    get copyrights() {
        return this.#copyrights;
    }

    get customData() {
        return this.#customData;
    }

    get declaredLicenses() {
        return this.#declaredLicenses;
    }

    get declaredLicenseStats() {
        return this.#declaredLicenseStats;
    }

    get dependencyTrees() {
        return this.#dependencyTrees;
    }

    get treeNodesByPackageIndex() {
        return this.#treeNodesByPackageIndex;
    }

    get detectedLicenses() {
        return this.#detectedLicenses;
    }

    get detectedLicenseStats() {
        return this.#detectedLicenseStats;
    }

    get issues() {
        return this.#issues;
    }

    get issueResolutions() {
        return this.#issueResolutions;
    }

    get levels() {
        return this.#levels;
    }

    get licenses() {
        return this.#licenses;
    }

    get packages() {
        return this.#packages;
    }

    get pathExcludes() {
        return this.#pathExcludes;
    }

    get paths() {
        return this.#paths;
    }

    get projects() {
        return this.#projects;
    }

    get scanResults() {
        return this.#scanResults;
    }

    get scopeExcludes() {
        return this.#scopeExcludes;
    }

    get scopes() {
        return this.#scopes;
    }

    get statistics() {
        return this.#statistics;
    }

    get repositoryConfiguration() {
        return this.#repositoryConfiguration;
    }

    get ruleViolations() {
        return this.#ruleViolations;
    }

    get ruleViolationResolutions() {
        return this.#ruleViolationResolutions;
    }

    getCopyrightByIndex(val) {
        return this.#copyrights[val] || null;
    }

    getLicenseByIndex(val) {
        return this.#licenses[val] || null;
    }

    getLicenseByName(val) {
        return this.#licenses[this.#licensesIndexesByNameMap.get(val)] || null;
    }

    getPackageByIndex(val) {
        return this.#packages[val] || null;
    }

    getPathByIndex(val) {
        return this.#paths[val] || null;
    }

    getIssuesForPackageIndex(val) {
        return this.#issuesByPackageIndexMap.get(val) || [];
    }

    getScanResultByIndex(val) {
        return this.#scanResults[val] || null;
    }

    getScopeByIndex(val) {
        return this.#scopes[val] || null;
    }

    getTreeNodeParentKeysByIndex(val) {
        return this.#treeNodesByPackageIndex[val] || null;
    }

    getRuleViolationsForPackageIndex(val) {
        return this.#ruleViolationsByPackageIndexMap.get(val) || [];
    }

    hasIssues() {
        const {
            openIssues: {
                errors,
                hints,
                warnings
            }
        } = this.statistics;

        return errors > 0 || hints > 0 || warnings > 0;
    }

    hasIssuesForPackageIndex(val) {
        return this.#issuesByPackageIndexMap.has(val);
    }

    hasRuleViolations() {
        const {
            openRuleViolations: {
                errors,
                hints,
                warnings
            }
        } = this.statistics;

        return errors > 0 || hints > 0 || warnings > 0;
    }

    hasRuleViolationsForPackageIndex(val) {
        return this.#ruleViolationsByPackageIndexMap.has(val);
    }
}

export default WebAppOrtResult;
