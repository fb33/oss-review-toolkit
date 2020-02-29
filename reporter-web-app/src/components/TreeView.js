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
import {
    Alert,
    Button,
    Drawer,
    Input,
    Row,
    Tree
} from 'antd';
import {
    ArrowDownOutlined,
    ArrowUpOutlined
} from '@ant-design/icons';
import { connect } from 'react-redux';
import scrollIntoView from 'scroll-into-view-if-needed';
import PackageCollapse from './PackageCollapse';
import {
    getOrtResult,
    getTreeView,
    getTreeViewShouldComponentUpdate
} from '../reducers/selectors';
import store from '../store';

const { TreeNode } = Tree;
const { Search } = Input;

class TreeView extends React.Component {
    componentDidMount() {
        this.scrollIntoView();
    }

    shouldComponentUpdate() {
        const { shouldComponentUpdate } = this.props;
        return shouldComponentUpdate;
    }

    componentDidUpdate() {
        this.scrollIntoView();
    }

    onChangeSearch = (e) => {
        e.stopPropagation();

        const { value } = e.target;
        const searchValue = value.trim();
        const { webAppOrtResult } = this.props;
        const searchPackageTreeNodeKeys = (searchValue === '') ? [] : webAppOrtResult.packages
            .reduce((acc, pkg) => {
                if (pkg.id.indexOf(searchValue) > -1) {
                    const treeNodeKeys = webAppOrtResult.getTreeNodeParentKeysByIndex(pkg.packageIndex);
                    if (treeNodeKeys) {
                        acc.push(treeNodeKeys);
                    }
                }

                return acc;
            }, []);
        console.log('searchPackageTreeNodeKeys', searchPackageTreeNodeKeys);
        window.searchPackageTreeNodeKeys = searchPackageTreeNodeKeys;

        const expandedKeys = Array.from(searchPackageTreeNodeKeys
            .reduce(
                (acc, treeNodeKeys) => new Set([...acc, ...treeNodeKeys.parentKeys]),
                new Set()
            ));
        const matchedKeys = Array.from(searchPackageTreeNodeKeys
            .reduce(
                (acc, treeNodeKeys) => new Set([...acc, ...treeNodeKeys.keys]),
                new Set()
            ));
        console.log('expandedKeys', expandedKeys);
        console.log('matchedKeys', matchedKeys);

        store.dispatch({
            type: 'TREE::SEARCH',
            payload: {
                expandedKeys,
                matchedKeys,
                searchValue
            }
        });
    };

    onExpandTreeNode = (expandedKeys) => {
        store.dispatch({ type: 'TREE::NODE_EXPAND', expandedKeys });
    };

    onSelectTreeNode = (selectedKeys, e) => {
        const { selectedNodes } = e;

        if (selectedNodes.length > 0) {
            const webAppPackage = selectedNodes[0];

            if (webAppPackage) {
                const { packageIndex } = webAppPackage;

                store.dispatch({
                    type: 'TREE::NODE_SELECT',
                    payload: {
                        selectedPackageIndex: packageIndex,
                        selectedKeys
                    }
                });
            }
        }
    }

    onClickPreviousSearchMatch = (e) => {
        e.stopPropagation();
        this.scrollIntoView();
        store.dispatch({ type: 'TREE::SEARCH_PREVIOUS_MATCH' });
    }

    onClickNextSearchMatch = (e) => {
        e.stopPropagation();
        this.scrollIntoView();
        store.dispatch({ type: 'TREE::SEARCH_NEXT_MATCH' });
    }

    onCloseDrawer = (e) => {
        e.stopPropagation();
        store.dispatch({ type: 'TREE::DRAWER_CLOSE' });
    }

    scrollIntoView = () => {
        const {
            treeView: {
                selectedKeys
            }
        } = this.props;

        if (selectedKeys.length === 0) {
            return;
        }

        const selectedElemId = `ort-tree-node-${selectedKeys[0]}`;
        const selectedElem = document.querySelector(`#${selectedElemId}`);

        if (selectedElem) {
            scrollIntoView(selectedElem, {
                scrollMode: 'if-needed',
                boundary: document.querySelector('.ort-tree-wrapper')
            });
        }
    }

    renderDrawer = () => {
        const {
            webAppOrtResult,
            treeView: {
                selectedPackageIndex,
                showDrawer
            }
        } = this.props;
        const selectedPackage = webAppOrtResult.getPackageByIndex(selectedPackageIndex);

        if (!showDrawer) {
            return null;
        }

        return (
            <Drawer
                title={selectedPackage.id}
                placement="right"
                closable
                onClose={this.onCloseDrawer}
                visible={showDrawer}
                width="65%"
            >
                <PackageCollapse
                    pkg={selectedPackage}
                />
            </Drawer>
        );
    }

    renderTreeNode = (data) => data.map((item) => {
        const {
            treeView: {
                searchValue
            }
        } = this.props;

        const index = item.title.indexOf(searchValue);
        const beforeSearchValueStr = item.title.substr(0, index);
        const afterSearchValueStr = item.title.substr(index + searchValue.length);
        let title;

        if (index > -1) {
            title = (
                <span id={`ort-tree-node-${item.key}`}>
                    {beforeSearchValueStr}
                    <span className="ort-tree-search-match">
                        {searchValue}
                    </span>
                    {afterSearchValueStr}
                </span>
            );
        } else {
            title = (
                <span id={`ort-tree-node-${item.key}`}>{item.title}</span>
            );
        }

        if (item.children) {
            return (
                <TreeNode
                    className={`node-${item.key}`}
                    dataRef={item}
                    filterTreeNode={
                        (node) => {
                            console.log('arg', node);
                        }
                    }
                    key={item.key}
                    title={title}
                >
                    {this.renderTreeNode(item.children)}
                </TreeNode>
            );
        }

        return (
            <TreeNode
                className={`node-${item.key}`}
                dataRef={item}
                key={item.key}
                title={title}
            />
        );
    });


    render() {
        const {
            webAppOrtResult: {
                dependencyTrees
            },
            treeView: {
                autoExpandParent,
                expandedKeys,
                matchedKeys,
                searchIndex,
                searchValue,
                selectedKeys
            }
        } = this.props;

        return (
            <div className="ort-tree">
                <div className="ort-tree-search">
                    <Search
                        placeholder="Input search text and press Enter"
                        onPressEnter={this.onChangeSearch}
                    />
                    {
                        matchedKeys.length ? (
                            <Row
                                type="flex"
                                align="middle"
                                className="ort-tree-navigation"
                            >
                                <Button onClick={this.onClickNextSearchMatch}>
                                    <ArrowDownOutlined />
                                </Button>
                                <Button onClick={this.onClickPreviousSearchMatch}>
                                    <ArrowUpOutlined />
                                </Button>
                                <span className="ort-tree-navigation-counter">
                                    {searchIndex + 1}
                                    {' '}
                                    /
                                    {matchedKeys.length}
                                </span>
                            </Row>
                        ) : null
                    }
                </div>
                {
                    matchedKeys.length === 0 && searchValue !== '' && (
                        <Alert
                            message={`No package names found which include '${searchValue}'`}
                            type="info"
                        />
                    )
                }
                <div className="ort-tree-wrapper">
                    <Tree
                        autoExpandParent={autoExpandParent}
                        expandedKeys={expandedKeys}
                        filterTreeNode={
                            (node) => {
                                if (node.key === 0) {
                                    console.log('arg', node);
                                    console.log('matchedKeys', matchedKeys);
                                    console.log('includes', matchedKeys.includes(node.key));
                                }
                                return matchedKeys.includes(node.key);
                            }
                        }
                        onExpand={this.onExpandTreeNode}
                        onSelect={this.onSelectTreeNode}
                        showLine
                        selectedKeys={selectedKeys}
                        treeData={dependencyTrees}
                    />
                </div>
                <div className="ort-tree-drawer">
                    {this.renderDrawer()}
                </div>
            </div>
        );
    }
}

TreeView.propTypes = {
    shouldComponentUpdate: PropTypes.bool.isRequired,
    treeView: PropTypes.object.isRequired,
    webAppOrtResult: PropTypes.object.isRequired
};

const mapStateToProps = (state) => ({
    shouldComponentUpdate: getTreeViewShouldComponentUpdate(state),
    treeView: getTreeView(state),
    webAppOrtResult: getOrtResult(state)
});

export default connect(
    mapStateToProps,
    () => ({}),
)(TreeView);
