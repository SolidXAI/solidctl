import { SolidUiEvent, SolidViewLayoutManager } from "@solidxai/core-ui";

const callLogsDispositionHandler = async (event: SolidUiEvent) => {
    const { modifiedField, modifiedFieldValue, formViewLayout } = event;

    const layout = formViewLayout;
    const layoutManager = new SolidViewLayoutManager(layout);

    if (modifiedField === 'category') {
        const dispositionWhereClause = {
            category: {
                id: { $eq: modifiedFieldValue?.id }
            }
        };


        layoutManager.updateNodeAttributes('disposition', {
            "whereClause": JSON.stringify(dispositionWhereClause)
        });

        return {
            layoutChanged: true,
            dataChanged: false,
            newLayout: layoutManager.getLayout(),
        }
    }

    if (modifiedField === 'disposition') {
        const subDispositionWhereClause = {
            disposition: {
                id: { $eq: modifiedFieldValue?.id }
            }
        };

        layoutManager.updateNodeAttributes('subDisposition', {
            "whereClause": JSON.stringify(subDispositionWhereClause)
        });

        return {
            layoutChanged: true,
            dataChanged: false,
            newLayout: layoutManager.getLayout(),
        }
    }
}

export default callLogsDispositionHandler;
