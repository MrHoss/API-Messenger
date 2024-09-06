import { Router } from "express";
import BWhatsapp from "./bwhatsapp/bwa";
import router from "./bwhatsapp/urls";

interface ModuleConstructor<T> {
  new(...args: string[]): T;
}

interface Modules<T> {
  [key: string]: {
    module: ModuleConstructor<T>,
    urls: Router
  };
}
type ActiveModules = BWhatsapp; // ...Adicionar outras classes de módulos

const modules: Modules<ActiveModules> = {
  bwhatsapp: { module: BWhatsapp, urls: router }
};
export default modules;