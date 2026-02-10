"use client'"
import { Skeleton } from 'primereact/skeleton'

export const SolidDashboardLoading = () => {
    return (
        <div className="grid p-4">

            {/* ROW 1 — Responsive KPI Cards */}
            <div className="col-12 sm:col-12 md:col-6 lg:col-6 xl:col-4">
                <div className="surface-card p-3 border-round shadow-1">
                    <Skeleton width="40%" height="1.4rem" className="mb-2" />
                    <Skeleton width="70%" height="2rem" />
                </div>
            </div>

            <div className="col-12 sm:col-12 md:col-6 lg:col-6 xl:col-4">
                <div className="surface-card p-3 border-round shadow-1">
                    <Skeleton width="40%" height="1.4rem" className="mb-2" />
                    <Skeleton width="70%" height="2rem" />
                </div>
            </div>

            <div className="col-12 sm:col-12 md:col-6 lg:col-6 xl:col-4">
                <div className="surface-card p-3 border-round shadow-1">
                    <Skeleton width="40%" height="1.4rem" className="mb-2" />
                    <Skeleton width="70%" height="2rem" />
                </div>
            </div>

            {/* ROW 2 — Responsive Charts: 2 cards on desktop, but collapses */}
            <div className="col-12 sm:col-12 md:col-6 lg:col-6 xl:col-4">
                <div className="surface-card p-3 border-round shadow-1">
                    <Skeleton width="30%" height="1.4rem" className="mb-3" />
                    <Skeleton width="100%" height="14rem" />
                </div>
            </div>

            <div className="col-12 sm:col-12 md:col-12 lg:col-12 xl:col-8">
                <div className="surface-card p-3 border-round shadow-1">
                    <Skeleton width="30%" height="1.4rem" className="mb-3" />
                    <Skeleton width="100%" height="14rem" />
                </div>
            </div>

            {/* ROW 3 — Full width always */}
            <div className="col-12">
                <div className="surface-card p-3 border-round shadow-1">
                    <Skeleton width="30%" height="1.4rem" className="mb-3" />
                    <Skeleton width="100%" height="16rem" />
                </div>
            </div>

        </div>
    )
}