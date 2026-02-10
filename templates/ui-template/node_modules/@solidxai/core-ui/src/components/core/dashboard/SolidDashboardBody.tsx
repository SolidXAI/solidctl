
import 'gridstack/dist/gridstack.min.css';
import { GridStackOptions, GridStackWidget } from 'gridstack';
import styles from './SolidDashboard.module.css'
import { SolidQuestionRenderer } from './SolidQuestionRenderer';
import { SqlExpression } from '../../../types/solid-core';
import PrimeReactDatatableRenderer from './chart-renderers/PrimeReactDatatableRenderer';
import { useGetDashboardQuestionDataByIdQuery } from '../../../redux/api/dashboardQuestionApi';
import qs from 'qs';
import { ProgressSpinner } from 'primereact/progressspinner';

export interface SolidDashboardBodyProps {
  dashboardOptions?: GridStackOptions;
  widgetOptions?: GridStackWidget[];
  // Replace `any` with a proper `Question` type when available
  questions: any[];
  filters: SqlExpression[];
}

const SolidDashboardBody = ({ questions, filters = [] }: SolidDashboardBodyProps) => {
  // const gridRef = useRef<HTMLDivElement>(null);

  // useEffect(() => {
  //   if (!gridRef.current) return;

  //   // Initialize Gridstack on the specific ref
  //   const grid = GridStack.init(dashboardOptions || {}, gridRef.current);

  //   // Load widgets if provided
  //   if (widgetOptions && widgetOptions.length > 0) {
  //     grid.load(
  //       widgetOptions.map((widget) => ({
  //         ...widget,
  //         content: `${widget.content ?? 'Widget'}`,
  //       }))
  //     );
  //   }

  //   // Cleanup on unmount
  //   return () => {
  //     grid.destroy(false);
  //   };
  // }, [dashboardOptions, widgetOptions]);


  // Fallback sequencing
  const questionsWithDefaultIndex = questions.map((q, index) => ({
    ...q,
    defaultIndex: index + 1,
  }));


  const sortedQuestions = [...questionsWithDefaultIndex].sort((a, b) => {
    const aSeq = a.sequenceNumber ?? a.defaultIndex;
    const bSeq = b.sequenceNumber ?? b.defaultIndex;
    return aSeq - bSeq;
  });


  return (
    <div className={`p-4 overflow-y-auto ${styles.SolidDashboardContentWrapper}`}>
      {/* <div className="grid-stack" ref={gridRef}></div> */}
      <div className='grid'>
        {/* {questions && questions.map((question: any) => {
          return (
            <div className='col-4 p-3'>
              <SolidQuestionRenderer question={question} filters={filters} key={question.id} isPreview={false} />
            </div>
          )
        })} */}
        {sortedQuestions
          .filter((question: any) => question.visualisedAs !== 'prime-datatable')
          .map((question: any) => (
            <div className="col-4 p-3" key={question.id}>
              <SolidQuestionRenderer
                question={question}
                filters={filters}
                isPreview={false}
              />
            </div>
          ))}

        {sortedQuestions
          .filter((question: any) => question.visualisedAs === 'prime-datatable')
          .map((question: any) => {
            const queryParams = qs.stringify({ isPreview: false, filters }, { arrayFormat: 'brackets' });

            const { data: questionData, isLoading } = useGetDashboardQuestionDataByIdQuery({
              id: question.id,
              qs: queryParams,
            });

            if (isLoading) return <ProgressSpinner />;
            const textAlign = question?.textAlign ?? 'start'

            return (
              <div className="col-12 p-3" key={question.id}>
                <div className={`${styles.SolidChartCardWrapper} p-4`} style={{ maxHeight: '40vh', overflowY: 'scroll' }}>
                  <div className={`font-medium text-${textAlign} ${styles.SolidChartTitle}`}>{question.name}</div>
                  <div className={`mt-2 font-bold text-3xl text-${textAlign} ${styles.SolidChartTitle}`}>{questionData.data.kpi}</div>
                  <div className='mt-3'>

                    <PrimeReactDatatableRenderer
                      options={JSON.parse(question?.chartOptions)}
                      visualizationData={questionData?.data?.visualizationData}
                    />
                  </div>
                </div>
              </div>
            )
          })}
      </div>
    </div>
  );
};

export default SolidDashboardBody;