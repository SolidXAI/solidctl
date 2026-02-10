
import "../../../../components/core/dashboard/chart-renderers/init-chartjs";
import { Bar, Line, Pie } from "react-chartjs-2";

type ChartJsRendererProps = {
    options: any;
    visualizationData: any;
    visualizedAs: 'bar' | 'line' | 'pie';
};
export const ChartJsRenderer = ({ options, visualizationData, visualizedAs }: ChartJsRendererProps) => {
    return (
        <>
            {visualizedAs === 'bar' && <Bar options={options} data={visualizationData} />}
            {visualizedAs === 'line' && <Line options={options} data={visualizationData} />}
            {visualizedAs === 'pie' && <Pie data={visualizationData} />}
        </>
    );
}