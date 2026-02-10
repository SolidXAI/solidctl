// @ts-nocheck
import React, { useRef } from "react";
import { SolidKanbanViewFields } from "./SolidKanbanViewFields";
import { usePathname } from "../../../hooks/usePathname";
import { useRouter } from "../../../hooks/useRouter";
import { useSearchParams } from "../../../hooks/useSearchParams";
import { Button } from "primereact/button";
import { OverlayPanel } from "primereact/overlaypanel";
import { Draggable, DraggableProvided } from "@hello-pangea/dnd";

// Define the types for the data and props
interface Data {
  id: string;
  title: string;
  content: string;
}

interface KanbanCardProps {
  data: Data;
  solidKanbanViewMetaData: any;
  index: number;
}

// Render columns dynamically based on metadata
const renderFieldsDynamically = (field: any, data: any, solidKanbanViewMetaData: any, setLightboxUrls?: any, setOpenLightbox?: any, groupedView: boolean) => {
  if (!solidKanbanViewMetaData) {
    return;
  }

  const solidView = solidKanbanViewMetaData.solidView;
  const solidFieldsMetadata = solidKanbanViewMetaData.solidFieldsMetadata;
  if (!solidView || !solidFieldsMetadata) {
    return;
  }
  const fieldMetadata = solidFieldsMetadata[field.attrs.name];
  const fieldLayout = field;
  return SolidKanbanViewFields({ solidKanbanViewMetaData, fieldMetadata, fieldLayout, data, setLightboxUrls, setOpenLightbox, groupedView });
  // return solidView.layout.children?.map((column: any) => {
  //   const fieldMetadata = solidFieldsMetadata[column.attrs.name];
  //   if (!fieldMetadata) {
  //     return;
  //   }

  //   return SolidKanbanViewFields({ solidKanbanViewMetaData, fieldMetadata, column });

  // });
};

const KanbanCard: React.FC<KanbanCardProps> = ({ data, solidKanbanViewMetaData, index, setLightboxUrls, setOpenLightbox, editButtonUrl, groupedView }) => {
  const router = useRouter()
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const SolidRow = ({ children, attrs }: any) => {
    const className = attrs.className;
    return (
      // <div className={`row ${className}`}>
      //   <div className="s_group">
      //     <div>
      //       {attrs.label && <p className="s_group_heading">{attrs.label}</p>}
      //       <div className="grid">{children}</div>
      //     </div>
      //   </div>
      // </div>
      <>
        {attrs.label && <p className="">{attrs.label}</p>}
        <div className={`row ${className}`}>
          {children}
        </div>
      </>
    );
  };
  const SolidColumn = ({ children, attrs }: any) => {
    const className = attrs.className;
    return (
      // <div className={`${className}`}>
      //   <div className="s_group">
      //     <div>
      //       {attrs.label && <p className="s_group_heading">{attrs.label}</p>}
      //       <div className="grid">{children}</div>
      //     </div>
      //   </div>
      // </div>
      <div className={`${className}`}>
        {attrs.label && <p className="">{attrs.label}</p>}
        {children}
      </div>
    );
  };
  const SolidImage = ({ children, attrs }: any) => {
    const className = attrs.className;
    return (
      // <div className={`${className}`}>
      //   <div className="s_group">
      //     <div>
      //       {attrs.label && <p className="s_group_heading">{attrs.label}</p>}
      //       <div className="grid">{children}</div>
      //     </div>
      //   </div>
      // </div>
      <div className={`${className}`}>
        {attrs.label && <p className="">{attrs.label}</p>}
        {children}
      </div>
    );
  };

  const SolidField = ({ field, data, solidKanbanViewMetaData }: any) => {

    return renderFieldsDynamically(field, data, solidKanbanViewMetaData, setLightboxUrls, setOpenLightbox, groupedView)
    // switch (solidKanbanViewMetaData[field.attrs.name].type) {
    //   case "mediaSingle":
    //     return <img src=""></img>
    //   default:
    //     return <p>{initialEntityData[field.attrs.name]}</p>

    // }
  };

  const SolidCard = ({ children }: any) => (
    <div className="p-fluid p-grid">
      {children}
    </div>
  );

  // Now render the form dynamically...
  const renderFormElementDynamically: any = (element: any, solidKanbanViewMetaData: any) => {
    let { type, attrs, body, children } = element;
    // const key = attrs?.name ?? generateRandomKey();
    const key = attrs?.name;
    switch (type) {
      case "div":
        if (!children)
          children = [];
        return <div key={key} {...attrs}>{children.map((element: any) => renderFormElementDynamically(element, solidFormViewMetaData, formik))}</div>
      case "span":
        return <span key={key} {...attrs}>{body}</span>
      case "p":
        return <p key={key} className={attrs?.className} {...attrs}>{body}</p>
      case "h1":
        return <h1 key={key} {...attrs}>{body}</h1>
      case "h2":
        return <h2 key={key} {...attrs}>{body}</h2>
      case "ul":
        if (!children)
          children = [];
        return <ul key={key} {...attrs}>{children.map((element: any) => renderFormElementDynamically(element, solidFormViewMetaData, formik))}</ul>
      case "li":
        return <li key={key} {...attrs}>{body}</li>
      case "card":
        return <SolidCard key={key}>{children.map((element: any) => renderFormElementDynamically(element, solidKanbanViewMetaData))}</SolidCard>;
      case "row":
        return <SolidRow key={key} attrs={attrs}>{children.map((element: any) => renderFormElementDynamically(element, solidKanbanViewMetaData))}</SolidRow>;
      case "column":
        return <SolidColumn key={key} attrs={attrs}>{children.map((element: any) => renderFormElementDynamically(element, solidKanbanViewMetaData))}</SolidColumn>;
      case "image":
        return <SolidImage key={key} attrs={attrs}>{children.map((element: any) => renderFormElementDynamically(element, solidKanbanViewMetaData))}</SolidImage>;

      case "field": {
        // const fieldMetadata = solidFieldsMetadata[attrs.name];
        const fieldMetadata = solidKanbanViewMetaData.solidFieldsMetadata[attrs.name];
        return <SolidField key={key} field={element} fieldMetadata={fieldMetadata} data={data ? data : null} solidKanbanViewMetaData={solidKanbanViewMetaData} />;
      }
      default:
        return null;
    }
  };

  const renderFormDynamically = (solidKanbanViewMetaData: any) => {
    if (!solidKanbanViewMetaData) {
      return;
    }
    const solidView = solidKanbanViewMetaData.solidView;
    const solidFieldsMetadata = solidKanbanViewMetaData.solidFieldsMetadata;
    if (!solidView || !solidFieldsMetadata) {
      return;
    }
    if (!solidView || !solidFieldsMetadata) {
      return;
    }
    const updatedLayout = solidView.layout.children;
    const dynamicForm = updatedLayout.map((element: any) => renderFormElementDynamically(element, solidKanbanViewMetaData));
    return dynamicForm;
  };

  const kanbanActionRef = useRef(null);

  const renderKanbanAction = (data, groupedView) => {
    return (
      <div className="solid-kanban-action" onClick={(e) => e.stopPropagation()}>
        <Button
          size="small"
          text
          className="text-sm p-0"
          icon="pi pi-ellipsis-v"
          onClick={(e) => kanbanActionRef.current.toggle(e)}
          style={{ width: 25, height: 25 }}
        />
        <OverlayPanel ref={kanbanActionRef} className="solid-custom-overlay">
          <div className="flex flex-column">
            <Button
              type="button"
              className="w-8rem text-left gap-1"
              label="Edit"
              size="small"
              iconPos="left"
              text
              icon={"pi pi-pencil"}
              onClick={() => router.push(`${editButtonUrl}/${data?.id}`)}
            />
            {!groupedView &&
              <a
                href={data?.relativeUri}
                download={data?.originalFileName}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  type="button"
                  className="w-8rem text-left gap-1"
                  label="Download"
                  size="small"
                  iconPos="left"
                  icon={"pi pi-download"}
                />
              </a>
            }
          </div>
        </OverlayPanel>
      </div>
    )
  }

  return (
    <Draggable draggableId={String(data.id)} index={index} isDragDisabled={!groupedView}>
      {(provided: DraggableProvided, snapshot) => (
        <div
          className=""
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={{ marginTop: "1rem", ...provided.draggableProps.style }}
          className="kanban-card-container"
        >
          {/* <p className="kanban-card-heading">{data.title}</p> */}
          {/* <p className="kanban-card-content">{data.content}</p> */}
          <div
            style={{
              opacity: snapshot.isDragging ? 0.9 : 1,
              transform: snapshot.isDragging ? "rotate(-2deg)" : "",
              cursor: 'pointer'
            }}
            elevation={snapshot.isDragging ? 3 : 1}
            className={`${!groupedView ? 'solid-media-card' : 'solid-kanban-card'}`}
            onClick={() => {
              if (typeof window !== "undefined") {
                // const queryString = searchParams.toString();
                // const finalUrl = queryString ? `${pathname}?${queryString}` : pathname;
                // sessionStorage.setItem("fromView", finalUrl);
                sessionStorage.setItem("fromView", "kanban");

              }
              router.push(`${editButtonUrl}/${data?.id}`)
            }}
          >
            {renderKanbanAction(data, groupedView)}
            {renderFormDynamically(solidKanbanViewMetaData)}
            {/* {solidKanbanViewMetaData?.solidView?.layout?.layoutData &&
              Object.entries(solidKanbanViewMetaData?.solidView?.layout?.layoutData).map(([key, value]) => (
                <p className="kanban-card-heading" key={key}>{data[value]}</p>
              ))
            } */}
            {/* <p className="kanban-card-content">{data.content}</p> */}
          </div>
        </div>
      )}
    </Draggable>
  );
};

export default KanbanCard;
