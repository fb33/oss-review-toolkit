/*
 * Copyright (C) 2017-2020 HERE Europe B.V.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
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

import React from 'react';
import PropTypes from 'prop-types';
import { Descriptions } from 'antd';

const { Item } = Descriptions;

// Generates the HTML for licenses declared or detected in a package
const PackageLicenses = (props) => {
    const { pkg } = props;

    return (
        <Descriptions
            className="ort-package-details"
            column={1}
            size="small"
        >
            {
                pkg.hasConcludedLicense()
                && (
                    <Item
                        label="Concluded SPDX"
                        key="ort-package-concluded-licenses"
                    >
                        {pkg.concludedLicense}
                    </Item>
                )
            }
            {
                pkg.hasDeclaredLicenses()
                && (
                    <Item
                        label="Declared"
                        key="ort-package-declared-licenses"
                    >
                        {Array.from(pkg.declaredLicenses).join(', ')}
                    </Item>
                )
            }
            {
                pkg.hasDeclaredLicensesSpdxExpression()
                && (
                    <Item
                        label="Declared (SPDX)"
                        key="ort-package-declared-spdx-licenses"
                    >
                        {pkg.declaredLicensesSpdxExpression}
                    </Item>
                )
            }
            {
                pkg.hasDeclaredLicensesUnmapped()
                && (
                    <Item
                        label="Declared (non-SPDX)"
                        key="ort-package-declared-non-spdx-licenses"
                    >
                        {pkg.pkg.declaredLicensesUnmapped}
                    </Item>
                )
            }
            {
                pkg.hasDetectedLicenses()
                && (
                    <Item
                        label="Detected"
                        key="ort-package-detected-licenses"
                    >
                        {Array.from(pkg.detectedLicenses).join(', ')}
                    </Item>
                )
            }
        </Descriptions>
    );
};

PackageLicenses.propTypes = {
    pkg: PropTypes.object.isRequired
};

export default PackageLicenses;
