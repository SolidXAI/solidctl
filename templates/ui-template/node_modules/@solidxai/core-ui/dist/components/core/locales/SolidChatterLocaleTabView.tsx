import React, { useEffect, useState } from 'react';
import { TabView, TabPanel } from 'primereact/tabview';
import { SolidChatter } from '../chatter/SolidChatter';
import SolidLocale from './SolidLocale';
import './solid-locale.css';
import { SolidAiMainWrapper } from '../solid-ai/SolidAiMainWrapper';
interface Props {
  solidFormViewMetaData: any;
  id: string;
  refreshChatterMessage: boolean;
  setRefreshChatterMessage: (value: boolean) => void;
  activeTab: number;
  selectedLocale: string | null;
  setSelectedLocale: (locale: string | null) => void;
  viewMode: string;
  createMode: boolean;
  //setDefaultLocaleId: (localeId: string) => void;
  handleLocaleChangeRedirect: (locale: string, defaultEntityLocaleId: string, viewMode: string) => void;
  defaultEntityLocaleId: string | null;
  solidFormViewData: any;
  published: string | null;
  actionsAllowed?: string[];
  mcpUrl?: string | null;
}

const SolidChatterLocaleTabView: React.FC<Props> = ({
  solidFormViewMetaData,
  id,
  refreshChatterMessage,
  setRefreshChatterMessage,
  selectedLocale,
  setSelectedLocale,
  activeTab,
  viewMode,
  createMode,
  handleLocaleChangeRedirect,
  defaultEntityLocaleId,
  solidFormViewData,
  published,
  actionsAllowed,
  mcpUrl
}) => {






  return (
    <TabView className="SolidCustomLocaleTabviewPanels h-full" activeIndex={activeTab}>
      {solidFormViewMetaData?.data?.solidView?.model?.draftPublishWorkflow &&
        <TabPanel header="Info" className={`SolidCustomLocaleTab p-2`}>
          <SolidLocale
            setSelectedLocale={setSelectedLocale}
            solidFormViewMetaData={solidFormViewMetaData}
            selectedLocale={selectedLocale}
            id={id}
            viewMode={viewMode}
            createMode={createMode}
            handleLocaleChangeRedirect={handleLocaleChangeRedirect}
            defaultEntityLocaleId={defaultEntityLocaleId}
            applicableLocales={solidFormViewMetaData?.data?.applicableLocales}
            solidFormViewData={solidFormViewData}
            published={published}
          />
        </TabPanel>
      }
      <TabPanel header="Audit Trail" className={`SolidCustomLocaleTab`} headerClassName='p-2'>
        <SolidChatter
          modelSingularName={solidFormViewMetaData?.data?.solidView?.model?.singularName}
          id={id}
          refreshChatterMessage={refreshChatterMessage}
          setRefreshChatterMessage={setRefreshChatterMessage}
          actionsAllowed={actionsAllowed}
        />
      </TabPanel>
      {
        mcpUrl &&
        (
          <TabPanel header="SolidX AI" className={`SolidCustomLocaleTab py-2`} contentClassName='h-full'>
            <div style={{ height: "calc(100vh - 60px)" }}>
              <SolidAiMainWrapper mcpUrl={mcpUrl} />
            </div>
          </TabPanel>
        )
      }
    </TabView>
  );
};

export default SolidChatterLocaleTabView;
