# 💼 Sistema **COOPRESTAMOS**  
### 📘 Carpeta: Diagramas del Sistema

Bienvenido a la sección de **Diagramas** del proyecto **Cooprestamos** 🏦.  
Aquí se documentan las representaciones visuales que reflejan la estructura, relaciones y funcionamiento del sistema, tanto a nivel de **base de datos** como **modelo orientado a objetos**.

---

## 🧩 **1. Diagrama de Entidad–Relación (ER)**  
Este diagrama representa las entidades, sus atributos y las relaciones existentes entre ellas.  
Es la base del diseño lógico de la base de datos implementada en **Supabase**.

🔗 **Ver diagrama en línea:**  
👉 [Abrir Diagrama ER en MermaidChart](https://www.mermaidchart.com/d/b23db98e-9fc4-44a8-bcc1-9d18d9678f81)


📘 **Descripción:**  
> El modelo ER muestra cómo interactúan las tablas principales del sistema: usuarios, préstamos, pagos, roles, socios y transacciones.  
> Permite asegurar la integridad referencial y optimizar las consultas SQL en la capa de persistencia.

---

## 🧱 **2. Diagrama de Clases (UML)**  
El diagrama de clases define la estructura del sistema desde una perspectiva **orientada a objetos**, mostrando las clases, atributos, métodos y relaciones entre ellas.

🔗 **Ver diagrama en línea:**  
👉 [Abrir Diagrama de Clases en MermaidChart](https://www.mermaidchart.com/d/c73190ed-52eb-49a7-b34d-65dab1565826)


📘 **Descripción:**  
> Este diagrama facilita la comprensión del diseño lógico de las clases, incluyendo asociaciones, composiciones y dependencias.  
> Sirve como guía para el desarrollo backend del sistema en **Django** y la integración con la base de datos **Supabase**.

---


## 🗂️ **Estructura del Directorio**
```bash
📂 documentos/
 └── 📂 base de datos/
      └── 📂 diagramas/
          ├── Diagrama ER.png
          ├── Diagrama de clases.png
          ├── Diagrama de Flujo de Datos 1.png
          ├── Diagrama de Flujo de Datos completo.png
          └── Léame.md
