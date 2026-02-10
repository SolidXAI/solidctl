
// import "../../../../components/core/dashboard/chart-renderers/init-chartjs";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { ProgressSpinner } from "primereact/progressspinner";

type PrimeReactDatatableRendererProps = {
    options: any;
    visualizationData: any;
}

const PrimeReactDatatableRenderer = ({ options, visualizationData }: PrimeReactDatatableRendererProps) => {
    // {
    //   "size": "small",
    //   "showGridlines": true,
    //   "stripedRows": true,
    //   "pagination": {
    //     "rows": 10,
    //     "rowsPerPageOptions": [5, 10, 25, 50]
    //   }
    // }    

    const size = options?.size || 'small';
    const showGridlines = options?.showGridLines || false;
    const stripedRows = options?.stripedRows || false;
    const paginator = options?.pagination || false;
    const rows = options?.pagination?.rows || 10;
    const rowsPerPageOptions = options?.pagination?.rowsPerPageOptions || [5, 10, 25, 50];

    if (!visualizationData) {
        return (
            <>
                <ProgressSpinner />
            </>
        );
    }

    const columns = visualizationData.columns;
    const data = visualizationData.rows;

    return (
        <>
            <DataTable value={data} tableStyle={{ minWidth: '50rem' }} size={size} showGridlines={showGridlines} stripedRows={stripedRows} paginator={paginator} rows={rows} rowsPerPageOptions={rowsPerPageOptions} >
                {
                    columns.map((col: any, i: number) => (
                        <Column key={col.field} field={col.field} header={col.header} />
                    ))
                }
            </DataTable>
        </>
    )
};

export default PrimeReactDatatableRenderer;