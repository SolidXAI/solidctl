
import { DashboardResponse, useGetDashboardQuery } from '../../../redux/api/dashboardApi';
import { SqlExpression } from '../../../types/solid-core';
import { Button } from 'primereact/button';
import { Tooltip } from "primereact/tooltip";
import qs from 'qs';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { SolidXAIIcon } from '../solid-ai/SolidXAIIcon';
import styles from './SolidDashboard.module.css';
import SolidDashboardBody from './SolidDashboardBody';
import SolidDashboardVariable from './SolidDashboardVariable';
import { SolidAiMainWrapper } from '../solid-ai/SolidAiMainWrapper';
import { SolidDashboardFilterRequired } from './SolidDashboardFilterRequired';
import { SolidDashboardLoading } from './SolidDashboardLoading';
import { SolidDashboardRenderError } from './SolidDashboardRenderError';
import { useDispatch, useSelector } from "react-redux";
import { showNavbar, toggleNavbar } from "../../../redux/features/navbarSlice";
import SolidDashboardNotAvailable from './SolidDashboardNotAvailable';
import { useLazyGetMcpUrlQuery, useLazyGetSolidSettingsQuery } from '../../../redux/api/solidSettingsApi';

export enum DashboardVariableType {
  DATE = 'date',
  SELECTION_STATIC = 'selectionStatic',
  SELECTION_DYNAMIC = 'selectionDynamic',
}

enum SOURCE_TYPE {
  SQL = 'sql',
  PROVIDER = 'provider',
}

export interface DashboardVariableRecord {
  id: number;
  variableName: string;
  variableType: DashboardVariableType;
  selectionStaticValues?: string[];
  selectionDynamicSourceType?: SOURCE_TYPE;
  selectionDynamicProviderName?: string;
  selectionDynamicSQL?: string;
  isMultiSelect?: boolean;
  defaultValue?: string;
  defaultOperator?: string;
}

function handleDashboardData(
  data: DashboardResponse,
  setDashboardVariables: Dispatch<SetStateAction<DashboardVariableRecord[]>>,
  setQuestions: Dispatch<SetStateAction<any[]>>,
) {
  const { records, meta } = data;
  if (records && records.length > 0) {
    // Set the layout options for the dashboard body
    const dashboardData = records[0]; // Assuming we want the first dashboard

    // Set the dashboard variables
    setDashboardVariables(dashboardData.dashboardVariables || []);

    // Set the dashboard questions
    setQuestions(dashboardData.questions)

  }
}

function getQueryParams(moduleName: string, dashboardId?: number, dashboardName?: string) {
  const filters: any = {
    module: {
      name: {
        $eq: moduleName
      }
    }
  };

  if (dashboardId !== undefined) {
    filters.id = { $eq: dashboardId };
  } else if (dashboardName !== undefined) {
    filters.name = { $eq: dashboardName };
  }

  const query = {
    filters,
    populate: ['dashboardVariables', 'questions']
  };
  const urlQuery = qs.stringify(query, {
    encodeValuesOnly: true,
  });
  return urlQuery;
}

// Render the dashboard body only if:
// 1. There are dashboard questions
// AND
// (
// 1. There are dashboard variables and all dashboard variable filter rules have been applied i.e (all dashboard variables have been selected)
//. OR
// 2. There are no dashboard variables
// )
// 
function isRenderDashboardBody(questions: any[], dashboardVariables: DashboardVariableRecord[], filters: SqlExpression[]) {
  if (questions.length === 0) {
    return false;
  }

  if (dashboardVariables.length === 0) {
    return true;
  }

  // Check if all dashboard variables have corresponding filters applied
  const allVariablesFiltered = dashboardVariables.every(variable =>
    filters.some(filter => filter.variableName === variable.variableName)
  );

  return allVariablesFiltered;
}

type SolidDashboardViewProps = {
  moduleName: string;
  dashboardId?: number;
  dashboardName?: string;
};

const SolidDashboard = (params: SolidDashboardViewProps) => {
  const { data, isLoading, error } = useGetDashboardQuery(getQueryParams(params.moduleName, params.dashboardId, params.dashboardName)) // FIXME : error handling should be done properly
  // Define a state called layoutOption and pass it after destructing the widgetOptions and dashboardOptions from layoutOption
  // TODO [HP]: Shouldn't the type of this state variable be something different? Why are we muddling this with layout but calling it body props? 
  // TODO [HP]: Body props should be clearly made up of Gridstack layout options, the questions that make up the body & the filter[] which is an array of SqlExpressions
  // TODO [HP]: This is fully CONFUSED
  // const [layoutOption, setLayoutOption] = useState<SolidDashboardBodyProps>({
  //   filters: [],
  //   questions: [],
  // });

  // TODO [HP]: replace dashboardVariableFilterRules with filters everywhere...
  // const [dashboardVariableFilterRules, setDashboardVariableFilterRules] = useState<ISolidDashboardVariableFilterRule[]>([]);
  const dispatch = useDispatch();
  const visibleNavbar = useSelector((state: any) => state.navbarState?.visibleNavbar);
  const [filters, setFilters] = useState<SqlExpression[]>([]);
  const [isOpenSolidXAiPanel, setIsOpenSolidXAiPanel] = useState(false);
  const [chatterWidth, setChatterWidth] = useState(380);
  const [isResizing, setIsResizing] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [dashboardVariables, setDashboardVariables] = useState<DashboardVariableRecord[]>([]);


  useEffect(() => {
    // Invoke the dashboard api to fetch the dashboard data
    // console.log('Dashboard Data testing:', isLoading, data, error);
    if (!isLoading && data) {
      // Assuming data contains the layout options
      handleDashboardData(data, setDashboardVariables, setQuestions);
    }
  }, [isLoading, data]);

  useEffect(() => {
    const storedOpen = localStorage.getItem('d_solidxai_open');
    const storedWidth = localStorage.getItem('d_solidxai_width');

    if (storedOpen !== null) {
      setIsOpenSolidXAiPanel(storedOpen === 'true');
    }

    if (storedWidth !== null) {
      const width = parseInt(storedWidth, 10);
      if (!isNaN(width)) {
        setChatterWidth(width);
      }
    }
  }, []);


  useEffect(() => {
    if (isResizing) {
      const handleMouseMove = (e: MouseEvent) => {
        const newWidth = window.innerWidth - e.clientX;
        const clampedWidth = Math.max(280, Math.min(newWidth, 700));
        setChatterWidth(clampedWidth);
        localStorage.setItem('d_solidxai_width', clampedWidth.toString());
      };

      const handleMouseUp = () => {
        setIsResizing(false);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing]);


  const handleOpen = () => {
    setIsOpenSolidXAiPanel(true);
    localStorage.setItem('d_solidxai_open', 'true');
  };

  const handleClose = () => {
    setIsOpenSolidXAiPanel(false);
    localStorage.setItem('d_solidxai_open', 'false');
  };

  const toggleBothSidebars = () => {
    if (visibleNavbar) {
      dispatch(toggleNavbar());   // close both
    } else {
      dispatch(showNavbar());     // open both
    }
  };



  const [mcpUrl, setMcpUrl] = useState<string | null>(null);
  const [getMcpUrl] = useLazyGetMcpUrlQuery();

  const [trigger, { data: solidSettingsData }] = useLazyGetSolidSettingsQuery();
  useEffect(() => {
    trigger("") // Fetch settings on mount
  }, [])

  useEffect(() => {
    if (solidSettingsData?.data?.mcpEnabled && solidSettingsData?.data?.mcpServerUrl) {
      enableSolidXAiPanel();
    }
  }, [solidSettingsData]);

  const enableSolidXAiPanel = async () => {
    try {
      const queryData = {
        showHeader: "true",
        inListView: "true"
      };
      const queryString = qs.stringify({ ...queryData }, { encodeValuesOnly: true });
      const response = await getMcpUrl(queryString).unwrap();
      console.log("response", response);
      if (response && response?.data?.mcpUrl) {
        setMcpUrl(response?.data?.mcpUrl);
      }
    } catch (error) {

    }
  }


  return (
    <div className={`h-screen surface-0 flex`}>
      <div className={`h-full flex-grow-1 ${styles.SolidDashboardPageContentWrapper}`}>
        {isLoading && <SolidDashboardLoading />}
        {error && <SolidDashboardRenderError />}
        {!isLoading && !error && data && data.records.length === 0 && (
          <SolidDashboardNotAvailable />
        )}
        {!isLoading && !error && data && data.records.length > 0 && (
          <>
            <div className="page-header" style={{ borderBottom: '1px solid var(--primary-light-color)' }}>
              <div className='flex align-items-center gap-2'>
                <div className="apps-icon block md:hidden cursor-pointer" onClick={toggleBothSidebars}>
                  <i className="pi pi-th-large"></i>
                </div>
                <p className={`view-title solid-text-wrapper flex align-items-center gap-1 ${styles.SolidDashboardTitle}`}>
                  {data?.records[0]?.displayName ? data?.records[0]?.displayName : data?.records[0]?.name}
                  {data?.records[0]?.description &&
                    <>
                      <Tooltip className='solid-field-tooltip' target=".solid-field-tooltip-icon" />
                      <i className="pi pi-info-circle solid-field-tooltip-icon"
                        data-pr-tooltip={data?.records[0]?.description}
                        data-pr-position={'right'}
                      />
                    </>
                  }
                </p>
              </div>
              {dashboardVariables && dashboardVariables.length > 0 && <SolidDashboardVariable dashboardVariables={dashboardVariables} filters={filters} setFilters={setFilters} />}
            </div>
            {!isRenderDashboardBody(questions, dashboardVariables, filters) && <SolidDashboardFilterRequired />}
            {isRenderDashboardBody(questions, dashboardVariables, filters) && <SolidDashboardBody questions={questions} filters={filters} />}
          </>
        )}
      </div>
      {mcpUrl && (
        <div className={`chatter-section ${isOpenSolidXAiPanel === false ? 'collapsed' : 'open'}`} style={{ width: chatterWidth }}>
          {isOpenSolidXAiPanel && (
            <div
              style={{
                width: 5,
                cursor: 'col-resize',
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                height: '100%',
                zIndex: 9,
              }}
              onMouseDown={() => setIsResizing(true)}
            />
          )}
          {isOpenSolidXAiPanel &&
            <Button
              icon="pi pi-angle-double-right"
              size="small"
              text
              className="chatter-collapse-btn"
              style={{ width: 30, height: 30, aspectRatio: '1/1' }}
              onClick={handleClose}
            />
          }

          {isOpenSolidXAiPanel === false ?
            <div className="flex flex-column gap-2 justify-content-center p-2">
              <div className="chatter-collapsed-content" onClick={handleOpen}>
                <div className="flex gap-2"> <SolidXAIIcon /> SolidX AI </div>
              </div>
              <Button
                icon="pi pi-chevron-left"
                size="small"
                className="px-0"
                style={{ width: 30 }}
                onClick={handleOpen}
              />
            </div>
            :
            <SolidAiMainWrapper mcpUrl={mcpUrl} />
          }
        </div>
      )}

    </div>
  );
}

export default SolidDashboard;
