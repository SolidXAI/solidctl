import { SolidModuleHome } from '@solidx/solid-core-ui';
import { capitalCase } from 'change-case';

type SolidViewParams = {
    params : {
        moduleName : string
    }
}
export default function ModuleHome({params}: SolidViewParams) {
    return (
        <div>
            <SolidModuleHome moduleName={capitalCase(params.moduleName)} />
        </div>
    );
}