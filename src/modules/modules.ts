import { Router } from "express";
import BWhatsapp from "./bwhatsapp/bwa";
import router from "./bwhatsapp/urls";

interface Modules{
    [key:string]:{
        module: new (...args: any[]) => any, 
        urls:Router
    }
};

const modules:Modules = {
    bwhatsapp:{module:BWhatsapp,urls:router}
}
export default modules;