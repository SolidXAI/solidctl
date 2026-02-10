
import React from 'react'
import { RightArrowSvg } from '../../../components/Svg/RightArrowSvg'

interface AuditRecord {
    field: string;
    fieldDisplayName: string;
    previous: string;
    current: string;
}

interface SolidChatterAuditMessageProps {
    auditRecord: AuditRecord[];
}

export const SolidChatterAuditMessage: React.FC<SolidChatterAuditMessageProps> = ({ auditRecord }) => {
    return (
        <div className='flex flex-column gap-2'>
            {auditRecord.map((item: AuditRecord, index: number) => (
                <div key={index} className='flex gap-2'>
                    <span className='m-0 text-sm'>
                        {"(" + (item.fieldDisplayName || item.field) + ")"}
                    </span>
                    <span className='m-0 text-sm font-bold'>
                        {item.previous}
                    </span>
                    <RightArrowSvg />
                    <span className='m-0 text-sm font-bold text-primary'>
                        {item.current}
                    </span>
                </div>
            ))}
        </div>
    );
};