import { Router } from "express";
import { activeModules } from "../settings";
import modules from "../modules/modules";
import { logger } from "../utils/logger";

const router = Router();

logger.info(`Active modules: \n[${activeModules.join(", ")}]`)
for(const activeModule of activeModules){
    if(activeModule in modules){
        const moduleEntry = modules[activeModule];
        if(moduleEntry && moduleEntry.urls){
            router.use(moduleEntry.urls);
        }
    }else{
        throw new Error(`Module ${activeModule} is not defined in modules`);
    }
}
export default router;

