// modules.ts

import { Router } from "express";
import BWhatsapp from "./bwhatsapp/bwa";
import router from "./bwhatsapp/urls";

// Define uma interface genérica para construtores de módulo
interface ModuleConstructor<T> {
  new(...args: never[]): T;
}

interface Modules<T> {
  [key: string]: {
    module: ModuleConstructor<T>,
    urls: Router
  };
}

// Define o tipo de módulos ativos
type ActiveModules = BWhatsapp; // Adicione outras classes conforme necessário

const modules: Modules<ActiveModules> = {
  bwhatsapp: { module: BWhatsapp, urls: router },
};

export default modules;
