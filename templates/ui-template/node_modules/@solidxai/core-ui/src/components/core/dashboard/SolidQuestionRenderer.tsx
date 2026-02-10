
import { useGetDashboardQuestionDataByIdQuery } from '../../../redux/api/dashboardQuestionApi';
import { SqlExpression } from '../../../types/solid-core';
import { Message } from 'primereact/message';
import { MeterGroup } from 'primereact/metergroup';
import { ProgressSpinner } from 'primereact/progressspinner';
import qs from 'qs';
import { ChartJsRenderer } from './chart-renderers/ChartJsRenderer';
import PrimeReactDatatableRenderer from './chart-renderers/PrimeReactDatatableRenderer';
import styles from './SolidDashboard.module.css';

type SolidQuestionRendererProps = {
    question: any;
    filters: SqlExpression[];
    isPreview: boolean;
};

type DataItem= {
    value: number;
    label?: string | HTMLElement;
    color?: string;
}

export const SolidQuestionRenderer = ({ question, filters = [], isPreview = false }: SolidQuestionRendererProps) => {
    if (!question) {
        return (
            <div className={`${styles.SolidChartCardWrapper} p-4`}>
                <Message text="Preview Unavailable" />
            </div>
        );
    }

    const textAlign = question?.textAlign ?? 'start'
    if (!question) {
        return (
            <>
                <Message text="Preview Unavailable" />
            </>
        )
    }
    // console.log(`Rendering BarChartRenderer using question id: ${question.id}`);

    // load the question data.
    const queryParams = qs.stringify(
        {
            isPreview,
            filters,
        },
        // ensures proper handling of arrays
        // { arrayFormat: 'indices' }
    );
    const { data: questionData, isLoading: questionDataIsLoading, error: questionDataError } = useGetDashboardQuestionDataByIdQuery({ id: question.id, qs: queryParams });


    // console.log(`Question data: `); console.log(questionData);
    // console.log(`Question data is loading: `); console.log(questionDataIsLoading);
    // console.log(`Question data error: `); console.log(questionDataError);
    const options = JSON.parse(question?.chartOptions);
    // const kpi = questionData.data.kpi;
    // const visualizationData = questionData.data.visualizationData;
    // const visualizedAs = question.data.visualisedAs;
    return (
        <>
            {questionDataIsLoading && <ProgressSpinner />}
            {!questionDataIsLoading &&
            <div className={`${styles.SolidChartCardWrapper} p-4 h-full`}>
                <div className={`font-medium text-${textAlign} ${styles.SolidChartTitle}`}>{question.name}</div>
                <div className={`mt-2 font-bold text-3xl text-${textAlign} ${styles.SolidChartTitle}`}>{questionData.data.kpi}</div>
                <div className='mt-3'>
                    {['bar', 'line', 'pie'].includes(question.visualisedAs) && <ChartJsRenderer options={options} visualizationData={questionData.data.visualizationData} visualizedAs={question.visualisedAs}  />}
                    {question.visualisedAs === 'prime-meter-group' && <MeterGroup values={questionData.data.visualizationData.dataset}  max={questionData?.data?.visualizationData?.dataset?.reduce((total: number, item: DataItem) => total + item.value, 0)}/>}
                    {question.visualisedAs === 'prime-datatable' && <PrimeReactDatatableRenderer options={options} visualizationData={questionData.data.visualizationData} />}
                </div>
            </div>
    }
        </>
    )
}