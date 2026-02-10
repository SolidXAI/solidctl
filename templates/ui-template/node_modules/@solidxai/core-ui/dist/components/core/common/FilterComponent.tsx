// @ts-nocheck
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { Tooltip } from 'primereact/tooltip';
import React, { useEffect, useRef, useState } from 'react';
import { SolidFilterFields } from '../filter/SolidFilterFields';
import { Button } from 'primereact/button';
import { Fieldset } from 'primereact/fieldset';
import { OverlayPanel } from 'primereact/overlaypanel';
import { AutoComplete } from 'primereact/autocomplete';

export enum FilterRuleType {
  RULE = 'rule',
  RULE_GROUP = 'rule_group'
}

export enum FilterOperator {
  AND = 'and',
  OR = 'or'
}

export enum FilterMatchMode {
  STARTS_WITH = 'startsWith',
  CONTAINS = 'contains',
  EQUALS = 'equals',
  GREATER_THAN = 'gt',
  LESS_THAN = 'lt',
}

export interface FilterRule {
  id: number;
  type: FilterRuleType;
  matchOperator?: FilterOperator;
  fieldName?: string | null;
  matchMode?: FilterMatchMode | null;
  value?: any;
  parentRule: number | null;
  children?: FilterRule[];
}

export interface Field {
  name: string;
  type: 'string' | 'number' | 'date';
}

// const fields: Field[] = [
//   { name: 'name', type: 'string' },
//   { name: 'dob', type: 'date' },
//   { name: 'lastName', type: 'string' },
//   { name: 'amount', type: 'number' }
// ];

const operatorOptions = {
  // string: [FilterMatchMode.CONTAINS, FilterMatchMode.EQUALS],
  // date: [FilterMatchMode.EQUALS, FilterMatchMode.GREATER_THAN, FilterMatchMode.LESS_THAN],
  // number: [FilterMatchMode.GREATER_THAN, FilterMatchMode.LESS_THAN],
  id: [FilterMatchMode.EQUALS, FilterMatchMode.NOT_EQUALS, FilterMatchMode.LESS_THAN, FilterMatchMode.LESS_THAN_OR_EQUAL_TO, FilterMatchMode.GREATER_THAN, FilterMatchMode.GREATER_THAN_OR_EQUAL_TO, FilterMatchMode.IN, FilterMatchMode.NOT_IN, FilterMatchMode.BETWEEN],
  int: [FilterMatchMode.EQUALS, FilterMatchMode.NOT_EQUALS, FilterMatchMode.LESS_THAN, FilterMatchMode.LESS_THAN_OR_EQUAL_TO, FilterMatchMode.GREATER_THAN, FilterMatchMode.GREATER_THAN_OR_EQUAL_TO, FilterMatchMode.IN, FilterMatchMode.NOT_IN, FilterMatchMode.BETWEEN],
  bigint: [FilterMatchMode.EQUALS, FilterMatchMode.NOT_EQUALS, FilterMatchMode.LESS_THAN, FilterMatchMode.LESS_THAN_OR_EQUAL_TO, FilterMatchMode.GREATER_THAN, FilterMatchMode.GREATER_THAN_OR_EQUAL_TO, FilterMatchMode.IN, FilterMatchMode.NOT_IN, FilterMatchMode.BETWEEN],
  float: [FilterMatchMode.EQUALS, FilterMatchMode.NOT_EQUALS, FilterMatchMode.LESS_THAN, FilterMatchMode.LESS_THAN_OR_EQUAL_TO, FilterMatchMode.GREATER_THAN, FilterMatchMode.GREATER_THAN_OR_EQUAL_TO, FilterMatchMode.IN, FilterMatchMode.NOT_IN, FilterMatchMode.BETWEEN],
  decimal: [FilterMatchMode.EQUALS, FilterMatchMode.NOT_EQUALS, FilterMatchMode.LESS_THAN, FilterMatchMode.LESS_THAN_OR_EQUAL_TO, FilterMatchMode.GREATER_THAN, FilterMatchMode.GREATER_THAN_OR_EQUAL_TO, FilterMatchMode.IN, FilterMatchMode.NOT_IN, FilterMatchMode.BETWEEN],
  shortText: [FilterMatchMode.STARTS_WITH, FilterMatchMode.CONTAINS, FilterMatchMode.NOT_CONTAINS, FilterMatchMode.ENDS_WITH, FilterMatchMode.EQUALS, FilterMatchMode.NOT_EQUALS, FilterMatchMode.IN, FilterMatchMode.NOT_IN],
  longText: [FilterMatchMode.STARTS_WITH, FilterMatchMode.CONTAINS, FilterMatchMode.NOT_CONTAINS, FilterMatchMode.ENDS_WITH, FilterMatchMode.EQUALS, FilterMatchMode.NOT_EQUALS, FilterMatchMode.IN, FilterMatchMode.NOT_IN],
  richText: [FilterMatchMode.STARTS_WITH, FilterMatchMode.CONTAINS, FilterMatchMode.NOT_CONTAINS, FilterMatchMode.ENDS_WITH, FilterMatchMode.EQUALS, FilterMatchMode.NOT_EQUALS, FilterMatchMode.IN, FilterMatchMode.NOT_IN],
  boolean: [FilterMatchMode.EQUALS],
  date: [FilterMatchMode.EQUALS, FilterMatchMode.NOT_EQUALS, FilterMatchMode.LESS_THAN, FilterMatchMode.LESS_THAN_OR_EQUAL_TO, FilterMatchMode.GREATER_THAN, FilterMatchMode.GREATER_THAN_OR_EQUAL_TO, FilterMatchMode.IN, FilterMatchMode.NOT_IN, FilterMatchMode.BETWEEN,],
  datetime: [FilterMatchMode.EQUALS],
  time: [FilterMatchMode.EQUALS],
  relation: [FilterMatchMode.IN, FilterMatchMode.NOT_IN],
  mediaSingle: [],
  mediaMultiple: [],
  selectionStatic: [FilterMatchMode.IN, FilterMatchMode.NOT_IN],
  selectionDynamic: [FilterMatchMode.IN, FilterMatchMode.NOT_IN],
  computed: [],
  externalId: [FilterMatchMode.IN, FilterMatchMode.NOT_IN],
  uuid: [FilterMatchMode.IN, FilterMatchMode.NOT_IN],

};

const getRandomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Component to render a single filter rule
const FilterRuleComponent = ({ viewData, fields, rule, onChange, onAddRule, onAddGroup, onDelete, level }) => {
  // const applicableOperators = rule.fieldName ? operatorOptions[fields.find(f => f.name === rule.fieldName)?.value.type].map(e => { return { name: e } }) : [];
  // const applicableInputField = rule.fieldName ? fields.find(f => f.name === rule.fieldName)?.type : "";

  const autoCompleteRef = useRef(null);

  const [fieldName, setFieldName] = useState({ name: rule.fieldName });
  const [matchMode, setMatchMode] = useState({ name: rule.matchMode });

  const [filteredFields, setFilteredFields] = useState<any[]>([]);

  const searchFields = (event: any) => {
    const query = event.query.toLowerCase();
    const filtered = !query
      ? fields
      : fields.filter((item: any) =>
        item.name.toLowerCase().startsWith(query)
      );
    setFilteredFields(filtered);
    setTimeout(() => {
        autoCompleteRef.current?.show();
    }, 0);
  };
  return (
    // <div style={{ marginLeft: (level - 1) * 10 + 'px' }} className="filter-rule">

    <div className='mt-2'>
      <div className='flex flex-column md:flex-row  align-items-start md:align-items-center gap-2 md:gap-3'>
        <div className='formgrid grid w-full'>
          <div className='col-12 md:col-4 pb-2 md:pb-0'>
            <AutoComplete
              ref={autoCompleteRef}
              value={fieldName.name}
              suggestions={filteredFields}
              completeMethod={searchFields}
              field="name"
              dropdown
              forceSelection // only values from list
              placeholder="Select Field"
              className="w-full p-inputtext-sm solid-filter-auto-complete-field"
              onChange={(e) => {
                setFieldName({ name: e.value }); // e.value will be an object or null
                if (e.value) {
                  onChange(rule.id, 'fieldName', e.value.value); // send value to parent
                } else {
                  onChange(rule.id, 'fieldName', '');
                }
              }}
            />
          </div>
          <div className='col-12 md:col-8'>
            <div className='formgrid grid w-full'>
              {rule.fieldName ?
                <div className='col-12'>
                  <SolidFilterFields viewData={viewData} fieldMetadata={viewData.data.solidFieldsMetadata[rule.fieldName]} onChange={onChange} index={rule.id} rule={rule}></SolidFilterFields>
                </div>
                : <>
                  <div className='col-12 md:col-6 pb-2 md:pb-0'>
                    <InputText
                      disabled
                      value={rule.value || ''}
                      placeholder="operator"
                      className='w-full p-inputtext-sm '
                    />
                  </div>
                  <div className='col-12 md:col-6'>
                    <InputText
                      disabled
                      value={rule.value || ''}
                      placeholder="value"
                      className='w-full p-inputtext-sm'
                    />
                  </div>
                </>
              }
            </div>
          </div>
        </div>
        <div className='formgrid grid'>
          <div className='col-4 px-0 flex align-items-center'>
            <Button text severity='secondary' icon="pi pi-plus" size='small' onClick={() => onAddRule(rule.parentRule)} className='solid-filter-action-btn' />
          </div>
          <div className='col-4 px-0 flex align-items-center'>
            <Button text severity='secondary' icon={"pi pi-folder-plus"} size='small' onClick={() => onAddGroup(rule.id)} className='solid-filter-action-btn' />
          </div>
          <div className='col-4 px-0 flex align-items-center'>
            <Button text severity='secondary' icon="pi pi-trash" size='small' onClick={() => onDelete(rule.id)} className='solid-filter-action-btn' />
          </div>
        </div>
      </div>

      {rule.children && rule.children.map(nestedRule => (
        <div className='py-3 nested-custom-filter' key={nestedRule.id}>
          {nestedRule.type === FilterRuleType.RULE
            ? <FilterRuleComponent key={nestedRule.id} viewData={viewData} fields={fields} rule={nestedRule} onChange={onChange} onAddRule={onAddRule} onAddGroup={onAddGroup} onDelete={onDelete} level={level + 1} />
            : <FilterGroupComponent key={nestedRule.id} viewData={viewData} fields={fields} group={nestedRule} onChange={onChange} onAddRule={onAddRule} onAddGroup={onAddGroup} onDelete={onDelete} level={level + 1} />
          }
        </div>
      ))}
      {/* <Button text label='Add Condition' icon="pi pi-plus" size='small' onClick={() => onAddRule(rule.parentRule)} /> */}
    </div>
  );
};

// Component to render a group of filter rules
const FilterGroupComponent = ({ viewData, fields, group, onChange, onAddRule, onAddGroup, onDelete, level }) => {
  const op = useRef(null);
  const legendTemplate = (
    <>
      <Button
        size='small'
        label={group.matchOperator}
        className='small-button'
        icon="pi pi-angle-down"
        iconPos='right'
        onClick={(e) => op.current.toggle(e)}
        style={{
          textTransform: "uppercase"
        }}
      />
      <OverlayPanel ref={op} className='m-0'>
        <div className='flex flex-column'>
          <Button
            size="small"
            label="AND"
            text
            className='small-button'
            onClick={(e) => { onChange(group.id, 'matchOperator', FilterOperator.AND); op.current.hide(e) }}
          />
          <Button
            size="small"
            label="OR"
            text
            className='small-button'
            onClick={(e) => { onChange(group.id, 'matchOperator', FilterOperator.OR); op.current.hide(e) }}
          />
        </div>
      </OverlayPanel>
    </>
    // <select className='filter-select'
    //   value={group.matchOperator}
    //   onChange={e => onChange(group.id, 'matchOperator', e.target.value)}
    // >
    //   <option value={FilterOperator.AND}>AND</option>
    //   <option value={FilterOperator.OR}>OR</option>
    // </select>
  )
  return (
    <Fieldset legend={legendTemplate} className='primary-filter-fieldset'>
      {group.children && group.children.map(rule => (
        rule.type === FilterRuleType.RULE
          ? <FilterRuleComponent key={rule.id} viewData={viewData} fields={fields} rule={rule} onChange={onChange} onAddRule={onAddRule} onAddGroup={onAddGroup} onDelete={onDelete} level={level + 1} />
          : <FilterGroupComponent key={rule.id} viewData={viewData} fields={fields} group={rule} onChange={onChange} onAddRule={onAddRule} onAddGroup={onAddGroup} onDelete={onDelete} level={level + 1} />
      ))}
      {/* {level > 0 &&
        <div className='mt-2'>
          <Button size="small" severity='danger' icon="pi pi-trash " onClick={() => onDelete(group.id)} />
        </div>
      } */}

      {/* Add Condition Button to add parent rule */}
      {level === 0 &&
        <Button text label='Add Condition' icon="pi pi-plus" size='small' onClick={() => onAddRule(group.id)} className='px-0 mt-2' />
      }
    </Fieldset>
  );
};

// Main Filter component
const FilterComponent = ({ viewData, fields, filterRules, setFilterRules, transformFilterRules, closeDialog }) => {
  // const initialState: FilterRule[] = [
  //   {
  //     id: 1,
  //     type: FilterRuleType.RULE_GROUP,
  //     matchOperator: FilterOperator.OR,
  //     parentRule: null,
  //     children: [
  //       {
  //         id: Date.now() + getRandomInt(1, 500),
  //         type: FilterRuleType.RULE,
  //         fieldName: null,
  //         matchMode: null,
  //         value: null,
  //         parentRule: 1,
  //         children: []
  //       }
  //     ]
  //   }
  // ];

  // const [filterRules, setFilterRules] = useState<FilterRule[]>(initialState);
  const [printedState, setPrintedState] = useState<string>('');

  const addChild = (rules, parentId, newChild) => {
    return rules.map(rule => {
      if (rule.id === parentId) {
        return {
          ...rule,
          children: [...(rule.children || []), newChild]
        };
      } else if (rule.children) {
        return {
          ...rule,
          children: addChild(rule.children, parentId, newChild)
        };
      }
      return rule;
    });
  };

  const handleChange = (id, key, value) => {
    const updateRuleRecursively = (rules) => {
      return rules.map(rule => {
        if (rule.id === id) {
          return { ...rule, [key]: value };
        } else if (rule.children) {
          return {
            ...rule,
            children: updateRuleRecursively(rule.children)
          };
        }
        return rule;
      });
    };
    setFilterRules(prev => updateRuleRecursively(prev));
  };

  const handleAddRule = (parentGroupId) => {
    const newRule: FilterRule = {
      id: Date.now(),
      type: FilterRuleType.RULE,
      fieldName: null,
      matchMode: null,
      value: null,
      parentRule: parentGroupId,
      children: []
    };
    setFilterRules(prev => addChild(prev, parentGroupId, newRule));
  };

  const handleAddGroup = (parentRuleId) => {
    const newGroupId = Date.now();
    const newGroup: FilterRule = {
      id: newGroupId,
      type: FilterRuleType.RULE_GROUP,
      matchOperator: FilterOperator.AND,
      parentRule: parentRuleId,
      children: [
        {
          id: Date.now() + getRandomInt(1, 500),
          type: FilterRuleType.RULE,
          fieldName: null,
          matchMode: null,
          value: null,
          parentRule: newGroupId,
          children: []
        },
        {
          id: Date.now() + getRandomInt(1, 500),
          type: FilterRuleType.RULE,
          fieldName: null,
          matchMode: null,
          value: null,
          parentRule: newGroupId,
          children: []
        }
      ]
    };
    setFilterRules(prev => addChild(prev, parentRuleId, newGroup));
  };

  // const handleDeleteRule = (id) => {
  //   const deleteRecursively = (rules, id) => {
  //     return rules.filter(rule => rule.id !== id).map(rule => {
  //       if (rule.children) {
  //         return {
  //           ...rule,
  //           children: deleteRecursively(rule.children, id)
  //         };
  //       }
  //       return rule;
  //     });
  //   };
  //   setFilterRules(prev => deleteRecursively(prev, id));
  // };


  const removeEmptyGroups = (rule) => {
    if (rule.type === "rule_group" && rule.children.length === 0) {
      return null;
    }

    rule.children = rule.children
      .map(removeEmptyGroups) // Recursively process children
      .filter(child => child !== null); // Remove null values

    return rule;
  };


  const handleDeleteRule = (id) => {
    if (filterRules[0].children.length === 1 && filterRules[0].children[0].id === id) {
      return
    }
    const deleteRecursively = (rules, id, isRoot = false) => {
      const mappedData = rules
        .map(rule => {
          if (rule.id === id) {
            return null; // Remove the target rule
          }

          if (rule.children) {
            const updatedChildren = deleteRecursively(rule.children, id);

            // If this rule had children and now has none, keep it but set children to []
            if (rule.children.length > 0 && updatedChildren.length === 0) {
              return { ...rule, children: [] };
            }

            return { ...rule, children: updatedChildren };
          }

          return rule;
        })
        .filter(rule => rule !== null); // Remove null values

      return mappedData
    };

    setFilterRules(prevRules => [removeEmptyGroups(deleteRecursively(prevRules, id, true)[0])]);
  };





  // const handlePrintState = () => {
  //   // setPrintedState(JSON.stringify(filterRules, null, 2)); // Pretty format the state
  //   transformFilterRules(filterRules)
  // };




  return (
    <div className=''>
      {filterRules.map(rule => (
        <FilterGroupComponent
          key={rule.id}
          viewData={viewData}
          fields={fields}
          group={rule}
          onChange={handleChange}
          onAddRule={handleAddRule}
          onAddGroup={handleAddGroup}
          onDelete={handleDeleteRule}
          level={0} // Top-level group
        />
      ))}
      <div className='flex gap-3 mt-3'>
        <Button label="Apply" size="small" onClick={() => transformFilterRules(filterRules)} type="submit" />
        <Button type='button' label='Cancel' outlined size='small' onClick={closeDialog} />
        {/* 
        <br></br>
        <textarea value={printedState} readOnly rows={20} cols={100} style={{ marginTop: '20px' }} /> */}
      </div>
    </div>
  );
};

export default FilterComponent;