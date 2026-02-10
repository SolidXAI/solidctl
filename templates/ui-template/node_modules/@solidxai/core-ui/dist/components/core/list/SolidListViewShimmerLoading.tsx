import { Skeleton } from 'primereact/skeleton'
import React from 'react'

export const SolidListViewShimmerLoading = () => {
    const rows = Array.from({ length: 14 });
    return (
        <div className='h-screen surface-0'>
            {/* <div className="page-header pl-2 ">
                <div className='flex align-items-center gap-3'>
                    <Skeleton width="50px" height='1.4rem' className='md:h-1.3rem border-round-lg '></Skeleton>
                    <Skeleton width="300px" className='border-round-lg hidden md:flex'></Skeleton>
                </div>
                <div className='flex align-items-center gap-3'>
                    <Skeleton width="2.7rem" height="1.6rem" className="md:w-4rem md:h-2rem" />
                    <Skeleton width="2.7rem" height="1.6rem" className="md:w-4rem md:h-2rem" />
                    <Skeleton width="2.7rem" height="1.6rem" className="md:w-4rem md:h-2rem flex md:hidden" />
                </div>
            </div> */}
            <div className='solid-list-skeleton-wrapper'>
                <table className="solid-list-skeleton-table" style={{ borderCollapse: 'collapse', width: '100%' }}>
                    <thead>
                        <tr className="solid-list-skeleton-header">
                            <th className="solid-list-skeleton-col-1">
                                <Skeleton width="16px" height='16px' className='border-round-xs' />
                            </th>
                            <th className="solid-list-skeleton-col-2">
                                <Skeleton width="70px" className='border-round-lg' />
                            </th>
                            <th className="solid-list-skeleton-col-3">
                                <Skeleton width="90px" className='border-round-lg' />
                            </th>
                            <th className="solid-list-skeleton-col-4">
                                <Skeleton width="80px" className='border-round-lg' />
                            </th>
                            <th className="solid-list-skeleton-col-5">
                                <Skeleton width="90px" className='border-round-lg' />
                            </th>
                            <th className="solid-list-skeleton-col-6">
                                <Skeleton width="100px" className='border-round-lg' />
                            </th>
                            <th className="solid-list-skeleton-col-7">
                                <Skeleton width="30px" className='border-round-lg' />
                            </th>
                            <th className="solid-list-skeleton-col-8">
                                <Skeleton width="30px" className='border-round-lg' />
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((_, i) => (
                            <tr className="solid-list-skeleton-row" key={i}>
                                <td><Skeleton width="16px" height='16px' className='border-round-xs'/></td>
                                <td><Skeleton width="50%" /></td>
                                <td><Skeleton width="50%" /></td>
                                <td><Skeleton width="50%" /></td>
                                <td><Skeleton width="50%" /></td>
                                <td><Skeleton width="50%" /></td>
                                <td><Skeleton shape="circle" height='15px' width='15px' /></td>
                                <td><Skeleton width="5px" height='20px' /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className='solid-list-skeleton-footer flex align-items-center justify-content-between'>
                    <div className='flex align-items-center gap-3'>
                        <Skeleton width="5rem" height="1rem"></Skeleton>
                        <Skeleton width="30px" height='15px' className='border-round-sm'></Skeleton>
                    </div>
                    <div className='flex align-items-center gap-3'>
                        <Skeleton width="70px"></Skeleton>
                        <Skeleton width="10px" height='15px' className='border-round-sm'></Skeleton>
                        <Skeleton width="15px" height='15px' className='border-round-sm'></Skeleton>
                    </div>
                </div>
            </div>
        </div>
    )
}