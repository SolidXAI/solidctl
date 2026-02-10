import { ERROR_MESSAGES } from "../../../constants/error-messages";
import { LayoutAttribute, LayoutNode } from "../../../types/solid-core";

/**
 * SolidViewLayoutManager
 *
 * Central manager for mutating Solid View layout trees.
 * Provides low-level tree operations and domain-specific helpers
 * for view attributes, form buttons, and row buttons.
 */
export class SolidViewLayoutManager {
    /** Internal mutable layout copy */
    private layout: LayoutNode;

    /**
     * Creates a new layout manager instance.
     * A deep copy of the provided layout is created to avoid side effects.
     *
     * @param layout - Original layout definition
     */
    constructor(layout: LayoutNode) {
        // Create a deep copy to prevent modifying the original object
        this.layout = structuredClone ? structuredClone(layout) : JSON.parse(JSON.stringify(layout));
    }

    /**
     * Recursively finds a layout node by its `attrs.name`.
     * Searches children and formButtons.
     *
     * @param node - Node to start searching from
     * @param name - Name of the node to find
     * @returns The matching LayoutNode or null
     */
    private findNode(node: LayoutNode, name: string): LayoutNode | null {
        if (node.attrs.name === name) {
            return node;
        }

        if (node.children) {
            for (let child of node.children) {
                const found = this.findNode(child, name);
                if (found) return found;
            }
        }

        // search in formButtons
        if (node.attrs?.formButtons) {
            for (const btn of node.attrs.formButtons) {
                const found = this.findNode(btn, name);
                if (found) return found;
            }
        }

        return null;
    }

    private findNodes(node: LayoutNode, name: string): LayoutNode[] {
        const nodes: LayoutNode[] = [];
        if (node.attrs.name === name) {
            nodes.push(node);
        }
        if (node.children) {
            for (let child of node.children) {
                nodes.push(...this.findNodes(child, name));
            }
        }
        if (node.attrs?.formButtons) {
            for (const btn of node.attrs.formButtons) {
                nodes.push(...this.findNodes(btn, name));
            }
        }
        return nodes;
    }

    /**
     * Recursively removes a node from the layout tree.
     *
     * @param parent - Parent node to search within
     * @param name - Name of the node to remove
     * @returns true if the node was removed
     */
    private removeNodeRecursive(parent: LayoutNode, name: string): boolean {
        if (!parent.children) return false;

        const index = parent.children.findIndex((child) => child.attrs.name === name);
        if (index !== -1) {
            parent.children.splice(index, 1); // Remove the node
            return true;
        }

        return parent.children.some((child) => this.removeNodeRecursive(child, name));
    }


    /**
      * Returns the managed layout instance.
      *
      * @returns Current layout tree
      */
    getLayout(): LayoutNode {
        // return structuredClone ? structuredClone(this.layout) : JSON.parse(JSON.stringify(this.layout));
        return this.layout;
    }

    /**
     * Updates attributes of a specific node.
     * This method adds or overrides attributes.
     *
     * @param name - Node name
     * @param newAttributes - Attributes to merge
     * @returns true if node was found and updated
     */
    updateNodeAttributes(name: string, newAttributes: Partial<LayoutAttribute>): boolean {
        const node = this.findNode(this.layout, name);
        if (node) {
            node.attrs = { ...node.attrs, ...newAttributes };
            return true;
        }
        return false;
    }

    /**
     * Adds a child node to a parent node.
     *
     * @param parentName - Name of the parent node
     * @param newNode - Child layout node to add
     * @param addChildrenToAll - If true, adds the child node to all nodes with the given parent name
     * @returns true if parent exists and child was added
     */
    addChildNode(parentName: string, newNode: LayoutNode, addChildrenToAll: boolean = false): boolean {
        console.log(`timepass....`);
        
        if (addChildrenToAll) {
            const parentNodes = this.findNodes(this.layout, parentName);
            parentNodes.forEach((node) => {
                if (!node.children) {
                    node.children = [];
                }
                node.children.push(newNode);
            });
            return true;
        }
        else {
            const parentNode = this.findNode(this.layout, parentName);
            if (parentNode) {
                if (!parentNode.children) {
                    parentNode.children = [];
                }
                parentNode.children.push(newNode);
                return true;
            }
            return false;
        }
    }


    /**
     * Removes a node and its subtree.
     * Root node removal is prevented.
     *
     * @param name - Name of the node to remove
     * @returns true if node was removed
     */
    removeNode(name: string): boolean {
        if (this.layout.attrs.name === name) {
            console.warn(ERROR_MESSAGES.REMOVE_ROOT_NODE);
            return false;
        }

        return this.removeNodeRecursive(this.layout, name);
    }

    /**
     * Traverses the entire layout tree and executes a callback for each node.
     *
     * @param callback - Function executed for each node
     * @param node - Starting node (defaults to root)
     */
    traverse(callback: (node: LayoutNode) => void, node: LayoutNode = this.layout) {
        callback(node);
        if (node.children) {
            node.children.forEach((child) => this.traverse(callback, child));
        }
    }



    /**
     * Adds or updates view-level attributes.
     * Existing attributes are updated, missing attributes are added.
     *
     * @param attrs - Attributes to set on the view
     * @returns true if at least one attribute was applied
     */
    setViewAttributes(attrs: Partial<LayoutAttribute>): boolean {
        const viewNode = this.findNode(this.layout, this.layout.attrs.name);
        if (!viewNode) return false;

        let changed = false;

        for (const key of Object.keys(attrs) as (keyof LayoutAttribute)[]) {
            const newValue = attrs[key];

            if (viewNode.attrs[key] !== newValue) {
                viewNode.attrs[key] = newValue;
                changed = true;
            }
        }

        return changed;
    }



    /**
     * Adds view-level attributes only if they do not already exist.
     *
     * @param attrs - Attributes to add
     * @returns true if at least one attribute was added
     */
    addViewAttributes(attrs: Partial<LayoutAttribute>): boolean {
        const viewNode = this.findNode(this.layout, this.layout.attrs.name);
        if (!viewNode) return false;

        let added = false;

        for (const key in attrs) {
            if (!(key in viewNode.attrs)) {
                // @ts-ignore – layout attributes are dynamic
                viewNode.attrs[key] = attrs[key];
                added = true;
            }
        }

        return added;
    }

    /**
     * Updates existing view-level attributes.
     * Attributes that do not exist are ignored.
     *
     * @param attrs - Attributes to update
     * @returns true if at least one attribute was updated
     */
    updateViewAttributes(attrs: Partial<LayoutAttribute>): boolean {
        const viewNode = this.findNode(this.layout, this.layout.attrs.name);
        if (!viewNode) return false;

        let updated = false;

        for (const key in attrs) {
            if (key in viewNode.attrs) {
                // @ts-ignore
                viewNode.attrs[key] = attrs[key];
                updated = true;
            }
        }

        return updated;
    }


    /**
     * Removes specific view-level attributes.
     *
     * @param keys - Attribute keys to remove
     * @returns true if at least one attribute was removed
     */
    removeViewAttributes(keys: (keyof LayoutAttribute)[]): boolean {
        const viewNode = this.findNode(this.layout, this.layout.attrs.name);
        if (!viewNode) return false;

        let removed = false;

        for (const key of keys) {
            if (key in viewNode.attrs) {
                // @ts-ignore
                delete viewNode.attrs[key];
                removed = true;
            }
        }

        return removed;
    }

    /**
     * Adds a new form-level button.
     *
     * @param button - Button layout node
     */
    addFormButton(button: LayoutNode): void {
        this.layout.attrs.formButtons ??= [];
        this.layout.attrs.formButtons.push(button);
    }

    /**
     * Updates a form button identified by its action.
     *
     * @param action - Button action identifier
     * @param attrs - Attributes to update
     * @returns true if button was found and updated
     */
    updateFormButtonByAction(
        action: string,
        attrs: Partial<LayoutAttribute>
    ): boolean {
        const button = this.layout.attrs.formButtons?.find(
            (b: any) => b.attrs.action === action
        );

        if (!button) return false;

        button.attrs = { ...button.attrs, ...attrs };
        return true;
    }

    /**
     * Removes a form button by its action.
     *
     * @param action - Button action identifier
     * @returns true if button was removed
     */
    removeFormButtonByAction(action: string): boolean {
        if (!this.layout.attrs.formButtons) return false;

        const initialLength = this.layout.attrs.formButtons.length;

        this.layout.attrs.formButtons = this.layout.attrs.formButtons.filter(
            (b: any) => b.attrs.action !== action
        );

        return this.layout.attrs.formButtons.length !== initialLength;
    }

    /**
     * Disables a form-level button.
     *
     * @param action - Button action identifier
     * @returns true if button was disabled
     */
    disableFormButton(action: string): boolean {
        return this.updateFormButtonByAction(action, { disabled: true });
    }


    /**
     * Hides a form-level button.
     *
     * @param action - Button action identifier
     * @returns true if button was hidden
     */
    hideFormButton(action: string): boolean {
        return this.updateFormButtonByAction(action, { visible: false });
    }


    /**
     * Adds a row-level button to a field.
     *
     * @param fieldName - Target field name
     * @param button - Button definition
     * @returns true if field exists and button was added
     */
    addRowButtonToField(fieldName: string, button: LayoutNode): boolean {
        const fieldNode = this.findNode(this.layout, fieldName);
        if (!fieldNode) return false;

        fieldNode.attrs.rowButtons ??= [];
        fieldNode.attrs.rowButtons.push(button);
        return true;
    }

    /**
     * Updates a row-level button for a field.
     *
     * @param fieldName - Field name
     * @param action - Button action identifier
     * @param attrs - Attributes to update
     * @returns true if button was updated
     */
    updateRowButtonByAction(
        fieldName: string,
        action: string,
        attrs: Partial<LayoutAttribute>
    ): boolean {
        const fieldNode = this.findNode(this.layout, fieldName);
        if (!fieldNode?.attrs?.rowButtons) return false;

        const button = fieldNode.attrs.rowButtons.find(
            (b: any) => b.action === action
        );

        if (!button) return false;

        Object.assign(button, attrs);
        return true;
    }


    /**
     * Removes a row-level button from a field.
     *
     * @param fieldName - Field name
     * @param action - Button action identifier
     * @returns true if button was removed
     */
    removeRowButtonByAction(fieldName: string, action: string): boolean {
        const fieldNode = this.findNode(this.layout, fieldName);
        if (!fieldNode?.attrs?.rowButtons) return false;

        const initialLength = fieldNode.attrs.rowButtons.length;

        fieldNode.attrs.rowButtons = fieldNode.attrs.rowButtons.filter(
            (b: any) => b.action !== action
        );

        return fieldNode.attrs.rowButtons.length !== initialLength;
    }


}