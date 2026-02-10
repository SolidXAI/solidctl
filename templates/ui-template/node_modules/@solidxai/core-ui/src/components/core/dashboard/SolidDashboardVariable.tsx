
import { SqlExpression } from "../../../types/solid-core";
import { AutoComplete, AutoCompleteChangeEvent, AutoCompleteCompleteEvent } from "primereact/autocomplete";
import { Calendar } from "primereact/calendar";
import { Nullable } from "primereact/ts-helpers";
import React, { Dispatch, SetStateAction, useEffect, useState } from "react";
import styles from './SolidDashboard.module.css';
import { useGetDashboardVariableSelectionDynamicValuesQuery } from "../../../redux/api/dashboardApi";
import { ProgressSpinner } from "primereact/progressspinner";
import { DashboardVariableRecord } from "./SolidDashboard";
import { Button } from "primereact/button";


export interface DashboardVariableFilterProps {
  setFilters: Dispatch<SetStateAction<SqlExpression[]>>;
  clearSignal: number;
  dashboardVariable: DashboardVariableRecord;
}

export const DateVariableFilterComponent: React.FC<DashboardVariableFilterProps> = ({ setFilters, clearSignal, dashboardVariable }) => {
  // Initialize the default dates state
  // If the dashboardVariable has a defaultOperator as Between and a defaultValue as two dates, we can set those as the initial values, otherwise null
  const defaultDatesString = dashboardVariable.defaultOperator === '$between' && dashboardVariable.defaultValue
  const defaultDatesArray = JSON.parse(defaultDatesString || '[]');
  // Map the defaultDatesArray to Date objects
  const defaultDates: Nullable<(Date | null)[]> = defaultDatesArray.length === 2 ? [
    new Date(defaultDatesArray[0]),
    new Date(defaultDatesArray[1])
  ] : null;
  const [dates, setDates] = useState<Nullable<(Date | null)[]>>(defaultDates);

  useEffect(() => {
    setDates(null);  // reset UI
  }, [clearSignal]);
  
  return (
    <div className={`flex align-items-center ${styles.SolidDashboardDateRangeFilterWrapper}`}>
      <Calendar value={dates} onChange={(e) => {
        console.log(`Calendar changed values are: `);
        console.log(e.value);
        const newDates = e.value as Date[] | null;
        setDates(newDates);

        if (newDates && newDates.length === 2 && newDates[0] && newDates[1]) {
          const filter: SqlExpression = {
            variableName: dashboardVariable.variableName,
            // @ts-ignore
            operator: '$between',
            value: [
              newDates[0].toISOString().split('T')[0],
              newDates[1].toISOString().split('T')[0]
            ]
          };
          setFilters(prev => {
            // Remove any existing dashboardDate filter and replace with the new one
            // const filtered = prev.filter(f => f.variableName !== 'dashboardDate');
            return [filter];
          });
        }

      }} selectionMode="range" readOnlyInput hideOnRangeSelection inputStyle={{ height: 36.38 }} className={styles.SolidDashboardDateRangeFilter} />
      <div className="px-2">
        <i className="pi pi-calendar opacity-50"></i>
      </div>
    </div>
  )
}

export const SelectionDynamicVariableFilterComponent: React.FC<DashboardVariableFilterProps> = ({ setFilters, clearSignal, dashboardVariable }) => {
  // Initialize the selection dynamic values state
  // Pick the values from defaultValue if present, for default operator $in
  const defaultDynamicValuesString = dashboardVariable.defaultOperator === '$in' && dashboardVariable.defaultValue;
  const defaultDynamicValues = JSON.parse(defaultDynamicValuesString || '[]');

  // Selection Dynamic Values
  const [selectionDynamicValues, setSelectionDynamicValues] = useState<string[]>(defaultDynamicValues);
  const [filteredItems, setFilteredItems] = useState<string[]>([]);

  // Using rtk query to fetch dynamic values based on variableId
  const variableId = dashboardVariable.id;
  const queryString = `variableId=${variableId}`;
  const { data: dynamicValues, isLoading, isError } = useGetDashboardVariableSelectionDynamicValuesQuery(queryString);

  const allItems = dynamicValues ? dynamicValues : [];

  // Dynamic search
  const searchDynamic = (event: AutoCompleteCompleteEvent) => {
    const query = event.query.toLowerCase();
    const filtered = allItems.map(item => item.label).filter(item =>
      item.toLowerCase().includes(query)
    );
    setFilteredItems(filtered);
  };

  // Set the filters whenever selectionDynamicValues change
  useEffect(() => {
    console.log(`Selection Dynamic Values changed:`, selectionDynamicValues);
    if (selectionDynamicValues.length > 0) {
      const filter: SqlExpression = {
        variableName: dashboardVariable.variableName,
        // @ts-ignore
        operator: '$in',
        value: selectionDynamicValues
      };
      setFilters(prev => {
        // Remove any existing filter for this variable and replace with the new one
        const filtered = prev.filter(f => f.variableName !== dashboardVariable.variableName);
        return [...filtered, filter];
      });
    }
    // else {
    //   // If no values selected, remove the filter for this variable
    //   setFilters(prev => prev.filter(f => f.variableName !== dashboardVariable.variableName));
    // }
  }, [selectionDynamicValues]);

  useEffect(() => {
    setSelectionDynamicValues([]);
  }, [clearSignal]);

  return (
    <>
      {isLoading && <ProgressSpinner></ProgressSpinner>}
      {isError && <div>Error loading values</div>}
      {!isLoading && !isError &&
        <AutoComplete
          value={selectionDynamicValues}
          suggestions={filteredItems}
          completeMethod={searchDynamic}
          onChange={(e: AutoCompleteChangeEvent) => {
            console.log('AutoComplete changed values are:');
            console.log(e);
            setSelectionDynamicValues(e.value)
          }}
          multiple
          dropdown
          placeholder={dashboardVariable.variableName}
          className="solid-standard-autocomplete"
          style={{ minHeight: 38 }}
        />
      }
    </>
  );
}

export const SelectionStaticVariableFilterComponent: React.FC<DashboardVariableFilterProps> = ({ setFilters, clearSignal, dashboardVariable }) => {
  // Initialize the selection static values state
  // Pick the values from defaultValue if present, for default operator $in
  const defaultStaticValuesString = dashboardVariable.defaultOperator === '$in' && dashboardVariable.defaultValue;
  const defaultStaticValues = JSON.parse(defaultStaticValuesString || '[]');

  // Selection Static Values
  const [selectionStaticValues, setSelectionStaticValues] = useState<string[]>(defaultStaticValues);
  const [filteredStaticItems, setFilteredStaticItems] = useState<string[]>([]);
  const staticValues = dashboardVariable.selectionStaticValues || [];

  // The values are in the format val:label, we need to extract the labels
  const staticValueItems = staticValues.map((val: any) => ({ value: val.split(':')[0], label: val.split(':')[1] }));

  // Static search
  const searchStatic = (event: AutoCompleteCompleteEvent) => {
    const query = event.query.toLowerCase();
    const filtered = staticValueItems.map(
      (item: { label: any; }) => item.label
    ).filter((item: string) =>
      item.toLowerCase().includes(query)
    );
    setFilteredStaticItems(filtered);
  };

  // Set the filters whenever selectionStaticValues change
  useEffect(() => {
    // console.log(`Selection Static Values changed:`, selectionStaticValues);
    if (selectionStaticValues.length > 0) {
      const filter: SqlExpression = {
        variableName: dashboardVariable.variableName,
        // @ts-ignore
        operator: '$in',
        value: selectionStaticValues
      };
      setFilters(prev => {
        // Remove any existing filter for this variable and replace with the new one
        const filtered = prev.filter(f => f.variableName !== dashboardVariable.variableName);
        return [...filtered, filter];
      });
    }
    // else {
    //   // If no values selected, remove the filter for this variable
    //   setFilters(prev => prev.filter(f => f.variableName !== dashboardVariable.variableName));
    // }
  }, [selectionStaticValues]);

  useEffect(() => {
    setSelectionStaticValues([]);
  }, [clearSignal]);

  return (
    <AutoComplete
      value={selectionStaticValues}
      suggestions={filteredStaticItems}
      completeMethod={searchStatic}
      onChange={(e: AutoCompleteChangeEvent) => setSelectionStaticValues(e.value)}
      multiple
      dropdown
      placeholder={dashboardVariable.variableName}
      className="solid-standard-autocomplete"
      style={{ minHeight: 38 }}
    />
  );
}

export interface SolidDashboardVariableProps {
  dashboardVariables: any;
  filters: SqlExpression[];
  setFilters: Dispatch<SetStateAction<SqlExpression[]>>;
}

const SolidDashboardVariable: React.FC<SolidDashboardVariableProps> = ({ dashboardVariables, filters, setFilters }) => {
  const [clearSignal, setClearSignal] = useState(0);
  const dashboardVariableComponents = dashboardVariables.map((dashboardVariable: any, index: number) => {
    switch (dashboardVariable.variableType) {
      case 'date':
        return <DateVariableFilterComponent key={index} setFilters={setFilters} clearSignal={clearSignal} dashboardVariable={dashboardVariable} />;
      case 'selectionStatic':
        return <SelectionStaticVariableFilterComponent key={index} setFilters={setFilters} clearSignal={clearSignal} dashboardVariable={dashboardVariable} />;
      case 'selectionDynamic':
        return <SelectionDynamicVariableFilterComponent key={index} setFilters={setFilters} clearSignal={clearSignal} dashboardVariable={dashboardVariable} />;
      default:
        return null;
    }
  });

  const clearAllFilters = () => {
    setFilters([]);
    setClearSignal(prev => prev + 1);  // triggers children to reset
  };

  // TODO [HP]: Currently this is static, we need this to be dynamic how we are invoking setFilters below has to be fully dynamic...
  return (
    <div className="flex align-items-center gap-3">
      {dashboardVariableComponents}
      {filters.length > 0 && (
        <Button
          onClick={clearAllFilters}
          size="small"
          outlined
          // severity="info"
          icon="pi pi-filter-slash"
        />
      )}
    </div>
  );
}

export default SolidDashboardVariable;

