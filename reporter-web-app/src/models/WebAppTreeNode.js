/*
 * Copyright (C) 2020 HERE Europe B.V.
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

class WebAppTreeNode {
    #anchestors;

    #children = [];

    #packageIndex;

    #parent;

    #path;

    #pathExcludes = new Set([]);

    #scopeExcludes = new Set([]);

    #webAppOrtResult;

    constructor(obj, callback, parent, anchestors) {
        const that = this;

        if (obj) {
            if (anchestors) {
                this.#anchestors = anchestors;
            } else {
                this.#anchestors = [];
            }

            if (Number.isInteger(obj.key)) {
                this.key = obj.key;
            }

            if (Number.isInteger(obj.pkg)) {
                this.#packageIndex = obj.pkg;
                if (anchestors) {
                    this.#anchestors.push(this.#packageIndex);
                }
            }

            if (obj.path_excludes || obj.pathExcludes) {
                const pathExcludes = obj.path_excludes || obj.pathExcludes;
                this.#pathExcludes = new Set(pathExcludes);
            }

            if (obj.scope_excludes || obj.scopeExcludes) {
                const scopeExcludes = obj.scope_excludes || obj.scopeExcludes;
                this.#scopeExcludes = new Set(scopeExcludes);
            }

            if (obj.title) {
                this.title = obj.title;
            }

            if (obj.children) {
                const { children } = obj;
                for (let i = 0, len = children.length; i < len; i++) {
                    this.#children.push(new WebAppTreeNode(children[i], callback, that, [...this.#anchestors]));
                }
            }

            if (parent) {
                this.#parent = parent;
            }

            if (Number.isInteger(this.#packageIndex)) {
                const parentKey = this.#parent ? this.#parent.key : this.#packageIndex;

                callback(this.#packageIndex, this.key, parentKey);
            }
        }
    }

    get anchestors() {
        return this.#anchestors;
    }

    get children() {
        return this.#children;
    }

    get packageIndex() {
        return this.#packageIndex;
    }

    get parent() {
        return this.#parent;
    }

    get pathExcludes() {
        return this.#pathExcludes;
    }

    get scopeExcludes() {
        return this.#scopeExcludes;
    }
}

export default WebAppTreeNode;
