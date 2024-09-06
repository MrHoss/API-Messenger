class Singleton {
  private static instance: Singleton;
  private id: string;

  private constructor() {
    // Gerar um ID único para esta instância
    this.id = Math.random().toString(36).substr(2, 9);
  }

  public static getInstance(): Singleton {
    if (!Singleton.instance) {
      Singleton.instance = new Singleton();
    }
    return Singleton.instance;
  }

  public getId(): string {
    return this.id;
  }

  public someMethod() {
    console.log('Método do Singleton');
  }
}

// Uso
const singleton1 = Singleton.getInstance();
const singleton2 = Singleton.getInstance();

console.log(`ID de singleton1: ${singleton1.getId()}`);
console.log(`ID de singleton2: ${singleton2.getId()}`);

console.log(singleton1 === singleton2); // true, ambas as referências são a mesma instância
