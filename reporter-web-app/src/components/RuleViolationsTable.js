/*
 * Copyright (C) 2019-2020 HERE Europe B.V.
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
import { Table } from 'antd';
import {
    ExclamationCircleOutlined,
    InfoCircleOutlined,
    IssuesCloseOutlined,
    WarningOutlined
} from '@ant-design/icons';

// Generates the HTML to display violations as a Table
const RuleViolationsTable = (props) => {
    const {
        expandedRowRender,
        showPackageColumn,
        violations
    } = props;

    // If return null to prevent React render error
    if (!violations) {
        return null;
    }

    const columns = [];
    const totalViolations = violations.length;

    columns.push({
        align: 'center',
        dataIndex: 'severityIndex',
        defaultSortOrder: 'ascend',
        filters: (() => [
            {
                text: (
                    <span>
                        <ExclamationCircleOutlined className="ort-red" />
                        {' '}
                        Errors
                    </span>
                ),
                value: 0
            },
            {
                text: (
                    <span>
                        <WarningOutlined className="ort-orange" />
                        {' '}
                        Warnings
                    </span>
                ),
                value: 1
            },
            {
                text: (
                    <span>
                        <InfoCircleOutlined className="ort-yellow" />
                        {' '}
                        Hints
                    </span>
                ),
                value: 2
            },
            {
                text: (
                    <span>
                        <IssuesCloseOutlined className="ort-green" />
                        {' '}
                        Resolved
                    </span>
                ),
                value: 3
            }
        ])(),
        onFilter: (value, row) => row.severityIndex === value,
        sorter: (a, b) => {
            if (a.severityIndex < b.severityIndex) {
                return -1;
            }
            if (a.severityIndex > b.severityIndex) {
                return 1;
            }

            return 0;
        },
        render: (text, row) => (
            row.isResolved
                ? (
                    <span>
                        <IssuesCloseOutlined
                            className="ort-green"
                        />
                    </span>
                ) : (
                    <span>
                        {
                            row.severity === 'ERROR'
                            && (
                                <ExclamationCircleOutlined
                                    className="ort-red"
                                />
                            )
                        }
                        {
                            row.severity === 'WARNING'
                            && (
                                <WarningOutlined
                                    className="ort-orange"
                                />
                            )
                        }
                        {
                            row.severity === 'HINT'
                            && (
                                <InfoCircleOutlined
                                    className="ort-yellow"
                                />
                            )
                        }
                    </span>
                )
        ),
        width: '5em'
    });

    if (showPackageColumn) {
        columns.push({
            ellipsis: true,
            dataIndex: 'packageName',
            key: 'packageName',
            title: 'Package',
            width: '25%'
        });
    }

    columns.push({
        dataIndex: 'rule',
        key: 'rule',
        title: 'Rule',
        width: '25%'
    });

    columns.push({
        dataIndex: 'message',
        key: 'message',
        textWrap: 'word-break',
        title: 'Message'
    });

    return (
        <Table
            className="ort-table-rule-violations"
            columns={columns}
            dataSource={violations}
            expandedRowRender={expandedRowRender}
            locale={{
                emptyText: 'No violations'
            }}
            pagination={
                {
                    defaultPageSize: 25,
                    hideOnSinglePage: true,
                    pageSizeOptions: ['50', '100', '250', '500'],
                    position: 'bottom',
                    showQuickJumper: true,
                    showSizeChanger: true,
                    showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} violations`
                }
            }
            rowKey="key"
            showHeader={totalViolations > 1}
            size="small"
        />
    );
};

RuleViolationsTable.propTypes = {
    expandedRowRender: PropTypes.func,
    violations: PropTypes.array.isRequired,
    showPackageColumn: PropTypes.bool
};

RuleViolationsTable.defaultProps = {
    expandedRowRender: null,
    showPackageColumn: false
};

export default RuleViolationsTable;
