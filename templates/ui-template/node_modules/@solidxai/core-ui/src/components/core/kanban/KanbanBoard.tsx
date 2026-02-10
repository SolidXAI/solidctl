// @ts-nocheck
import { useState } from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import KanbanColumn from "./KanbanColumn";

// Define types for groupData and Grouped Data
interface Post {
    id: string;
    title: string;
    status: string;
}

interface GroupData {
    count: number;
    records: Post[];
}

interface ApiResponse {
    data: {
        groupedData: Record<string, GroupData>;
    };
}

export const KanbanBoard = ({ groupByFieldName, groupedView, kanbanViewData, maxSwimLanesCount, solidKanbanViewMetaData, setKanbanViewData, handleLoadMore, onDragEnd, handleSwimLanePagination, setLightboxUrls, setOpenLightbox, editButtonUrl }: any) => {
    const [loading, setLoading] = useState<boolean>(true);
    // State to manage the folded status of each column
    const [foldedStates, setFoldedStates] = useState<Record<string, boolean>>({});

    // Toggle fold (not yet implemented)
    const toggleFold = (status: string): void => {
        setFoldedStates((prevFoldedStates) => ({
            ...prevFoldedStates,
            [status]: !prevFoldedStates[status],
        }));
    };

    // Render the Kanban board
    return (
        //@ts-ignore
        <div className="solid-kanban-board-wrapper">
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex gap-4 px-4 md:px-5 py-3 md:py-4 solid-kanban-board-scroll-context">
                    {/* {Object.entries(kanbanViewData).map(([groupVal, data]) => {
                    const group = {
                        label: groupVal,
                        count: data.count,
                        folded: foldedStates[groupVal] || false,
                    };

                    return (
                        <KanbanColumn
                            key={groupVal}
                            groupByField={groupVal}
                            group={group}
                            groupData={data.records}
                            toggleFold={toggleFold}
                            handleLoadMore={handleLoadMore}
                        />
                    );
                })} */}
                    {kanbanViewData.map((data: any) => {
                        // Find the displayName for the groupName from solidKanbanViewMetaData.solidFieldsMetadata
                        let label = data.groupName;
                        const fieldMeta = solidKanbanViewMetaData?.solidFieldsMetadata?.[groupByFieldName];
                        if (
                            fieldMeta &&
                            fieldMeta.type === "selectionStatic" &&
                            Array.isArray(fieldMeta.selectionStaticValues)
                        ) {
                            const match = fieldMeta.selectionStaticValues.find(
                                (v: string) => {
                                    const [value, displayName] = v.split(":");
                                    return value === data.groupName;
                                }
                            );
                            if (match) {
                                label = match.split(":")[1];
                            }
                        }

                        const group = {
                            label,
                            count: data.groupData.meta.totalRecords,
                            limit: data.groupData.meta.perPage,
                            currentPage: data.groupData.meta.currentPage,
                            folded: foldedStates[data.groupName] || false,
                        };

                        return (
                            <KanbanColumn
                                key={data.groupName}
                                groupedView={groupedView}
                                groupByField={data.groupName}
                                group={group}
                                solidKanbanViewMetaData={solidKanbanViewMetaData}
                                groupData={data.groupData.records}
                                toggleFold={toggleFold}
                                handleLoadMore={handleLoadMore}
                                setLightboxUrls={setLightboxUrls}
                                setOpenLightbox={setOpenLightbox}
                                editButtonUrl={editButtonUrl}
                            />
                        );
                    })}
                    {groupedView !== false && kanbanViewData.length < maxSwimLanesCount &&
                        <div>
                            <a size="small" className="kaban-swimlane-load-more" style={{ textWrap: 'nowrap' }} text onClick={handleSwimLanePagination}>Load More...({maxSwimLanesCount - kanbanViewData.length})</a>
                        </div>
                    }
                </div>
            </DragDropContext>
        </div>
    );
}

export default KanbanBoard;
