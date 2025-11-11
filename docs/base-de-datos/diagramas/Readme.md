# 💼 Sistema **COOPRESTAMOS**  
### 📘 Carpeta: Diagramas del Sistema

Bienvenido a la sección de **Diagramas** del proyecto **Cooprestamos** 🏦.  
Aquí se documentan las representaciones visuales que reflejan la estructura, relaciones y funcionamiento del sistema, tanto a nivel de **base de datos** como **modelo orientado a objetos**.

---
## 🧩 1. Diagrama de Entidad–Relación (ER)

### 🧱 Descripción  
El **Diagrama ER** muestra las **entidades**, **atributos** y **relaciones** del sistema.  
Es la base del diseño lógico de la base de datos implementada en **Supabase (PostgreSQL)**.  


### 🔗 Acceso al diagrama  
- 📄 **Versión Draw.io** → [Abrir en Draw.io](https://drive.google.com/file/d/13iGkCnTIVcUe5uLYJVLEf9XAWANTqU5X/view?usp=sharing)
- > ⚠️ *Nota:* Para poder visualizar este enlace debes iniciar sesión en tu navegador con tu **correo institucional de la Universidad del Valle (@correounivalle.edu.co)**.    
- 🌐 **Versión visual (PNG)** → [Ver imagen en GitHub](docs/base-de-datos/diagramas/Diagrama_ER_COOPRESTAMOS.drawio.png)

---

## 🧭 2. Diagrama de Clases (UML)

### 🧱 Descripción  
El **Diagrama de Clases UML** define la estructura del sistema desde una perspectiva **orientada a objetos**, mostrando:
- Clases principales (como `Usuario`, `Prestamo`, `Pago`, `Cartera`, `Evaluacion`, etc.)  
- Sus **atributos** y **métodos**  
- Las **relaciones** entre ellas (asociaciones, composiciones, dependencias).  

Este diagrama sirve como guía para el desarrollo del backend en **Django**, reflejando la correspondencia entre modelos y tablas en Supabase.

### 🔗 Acceso al diagrama  
- 📄 **Versión Draw.io** → [Abrir en Draw.io](https://drive.google.com/file/d/13iGkCnTIVcUe5uLYJVLEf9XAWANTqU5X/view?usp=sharing)
- > ⚠️ *Nota:* Para poder visualizar este enlace debes iniciar sesión en tu navegador con tu **correo institucional de la Universidad del Valle (@correounivalle.edu.co)**.  
- 🌐 **Versión visual (PNG)** → [Ver imagen en GitHub](docs/base-de-datos/diagramas/DiagramaClases-COOPRESTAMOS.drawio.png)

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
