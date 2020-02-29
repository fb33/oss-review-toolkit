/*
 * Copyright (C) 2017-2020 HERE Europe B.V.
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

import React from 'react';
import { connect } from 'react-redux';
import {
    Button,
    Table,
    Tooltip
} from 'antd';
import {
    FileAddOutlined,
    FileExcelOutlined
} from '@ant-design/icons';
import PropTypes from 'prop-types';
import {
    getOrtResult,
    getTableView,
    getTableViewShouldComponentUpdate
} from '../reducers/selectors';
import store from '../store';
import PackageCollapse from './PackageCollapse';

class TableView extends React.Component {
    shouldComponentUpdate() {
        const { shouldComponentUpdate } = this.props;
        return shouldComponentUpdate;
    }

    render() {
        const {
            tableView: {
                filter: {
                    filteredInfo,
                    sortedInfo
                }
            },
            webAppOrtResult
        } = this.props;

        const sortColumnFilters = (a, b) => {
            if (a.text < b.text) {
                return -1;
            }
            if (a.text > b.text) {
                return 1;
            }
            return 0;
        };

        // Specifies table columns as per
        // https://ant.design/components/table/
        const columns = [
            {
                align: 'right',
                filters: (() => [
                    {
                        text: (
                            <span>
                                <FileExcelOutlined className="ort-blue" />
                                {' '}
                                Excluded
                            </span>
                        ),
                        value: 'excluded'
                    },
                    {
                        text: (
                            <span>
                                <FileAddOutlined />
                                {' '}
                                Included
                            </span>
                        ),
                        value: 'included'
                    }
                ])(),
                filterMultiple: true,
                filteredValue: filteredInfo.excludes || null,
                key: 'excludes',
                onFilter: (value, pkg) => {
                    if (value === 'excluded') {
                        return pkg.isExcluded;
                    }

                    if (value === 'included') {
                        return !pkg.isExcluded;
                    }

                    return false;
                },
                render: (pkg) => (
                    pkg.isExcluded ? (
                        <span className="ort-project-id">
                            <Tooltip
                                placement="right"
                                title="FIXME INSERT EXCLUDE REASON"
                            >
                                <FileExcelOutlined className="ort-blue" />
                            </Tooltip>
                        </span>
                    ) : (
                        <FileAddOutlined />
                    )
                ),
                width: '2em'
            },
            {
                align: 'left',
                dataIndex: 'id',
                ellipsis: true,
                filters: (() => {
                    const { projects } = webAppOrtResult;
                    return projects
                        .map(
                            (project) => (
                                {
                                    text: project.definitionFilePath ? project.definitionFilePath : project.id,
                                    value: project._id
                                }
                            )
                        )
                        .sort(sortColumnFilters);
                })(),
                filterMultiple: true,
                filteredValue: filteredInfo.id || null,
                onFilter: (value, pkg) => pkg.projectIndexes.has(value),
                sorter: (a, b) => {
                    const idA = a.id.toUpperCase();
                    const idB = b.id.toUpperCase();
                    if (idA < idB) {
                        return -1;
                    }
                    if (idA > idB) {
                        return 1;
                    }

                    return 0;
                },
                sortOrder: sortedInfo.columnKey === 'id' && sortedInfo.order,
                title: 'Package'
            },
            {
                align: 'left',
                dataIndex: 'scopeIndexes',
                filters: (
                    () => webAppOrtResult.scopes
                        .map(
                            (scope) => ({ text: scope.name, value: scope.id })
                        )
                        .sort(sortColumnFilters)
                )(),
                filteredValue: filteredInfo.scopeIndexes || null,
                onFilter: (value, pkg) => pkg.hasScopeIndex(value),
                title: 'Scopes',
                render: (scopeIndexes, pkg) => (
                    <span>
                        {Array.from(pkg.scopeNames).join(',')}
                    </span>
                )
            },
            {
                align: 'center',
                dataIndex: 'levels',
                filters: (() => webAppOrtResult.levels.map((level) => ({ text: level, value: level })))(),
                filteredValue: filteredInfo.levels || null,
                filterMultiple: true,
                onFilter: (value, pkg) => pkg.hasLevel(value),
                textWrap: 'word-break',
                title: 'Levels',
                render: (levels) => (
                    <span>
                        {Array.from(levels).join(', ')}
                    </span>
                ),
                width: 80
            },
            {
                align: 'left',
                dataIndex: 'declaredLicenses',
                filters: (
                    () => webAppOrtResult.declaredLicenses.map((license) => ({ text: license, value: license }))
                )(),
                filteredValue: filteredInfo.declaredLicenses || null,
                filterMultiple: true,
                key: 'declaredLicenses',
                onFilter: (value, pkg) => pkg.declaredLicenses.has(value),
                textWrap: 'word-break',
                title: 'Declared Licenses',
                render: (declaredLicenses) => (
                    <span>
                        {Array.from(declaredLicenses).join(', ')}
                    </span>
                ),
                width: '18%'
            },
            {
                align: 'left',
                dataIndex: 'detectedLicenses',
                filters: (
                    () => webAppOrtResult.detectedLicenses.map((license) => ({ text: license, value: license }))
                )(),
                filteredValue: filteredInfo.detectedLicenses || null,
                filterMultiple: true,
                onFilter: (license, pkg) => pkg.detectedLicenses.has(license),
                textWrap: 'word-break',
                title: 'Detected Licenses',
                render: (detectedLicenses) => (
                    <span>
                        {Array.from(detectedLicenses).join(', ')}
                    </span>
                ),
                width: '18%'
            }
        ];

        return (
            <div>
                <div className="ort-table-operations">
                    <Button
                        onClick={() => {
                            store.dispatch({ type: 'TABLE::CLEAR_FILTERS_TABLE' });
                        }}
                        size="small"
                    >
                        Clear filters
                    </Button>
                </div>
                <Table
                    columns={columns}
                    expandedRowRender={
                        (pkg) => (
                            <PackageCollapse
                                pkg={pkg}
                            />
                        )
                    }
                    dataSource={webAppOrtResult.packages}
                    expandRowByClick
                    indentSize={0}
                    locale={{
                        emptyText: 'No packages'
                    }}
                    onChange={(pagination, filters, sorter, extra) => {
                        store.dispatch({
                            type: 'TABLE::CHANGE_PACKAGES_TABLE',
                            payload: {
                                filter: {
                                    filteredInfo: filters,
                                    sortedInfo: sorter
                                },
                                filterData: extra.currentDataSource
                            }
                        });
                    }}
                    pagination={
                        {
                            defaultPageSize: 100,
                            hideOnSinglePage: true,
                            pageSizeOptions: ['50', '100', '250', '500'],
                            position: 'both',
                            showSizeChanger: true
                        }
                    }
                    size="small"
                    rowClassName="ort-package"
                    rowKey="key"
                />
            </div>
        );
    }
}

TableView.propTypes = {
    shouldComponentUpdate: PropTypes.bool.isRequired,
    tableView: PropTypes.object.isRequired,
    webAppOrtResult: PropTypes.object.isRequired
};

const mapStateToProps = (state) => ({
    shouldComponentUpdate: getTableViewShouldComponentUpdate(state),
    tableView: getTableView(state),
    webAppOrtResult: getOrtResult(state)
});

export default connect(
    mapStateToProps,
    () => ({})
)(TableView);
