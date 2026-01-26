# LH1 – Sales & Marketing System  
## Quotation Module (Internal Prototype)

LH1 is the first internal prototype of a **Sales & Marketing system** developed for  
**Laboratoire Hibalogique Inc.**

This version focuses on a **professional quotation module** designed for internal use by employees to create, manage, preview, and export client quotations with automatic calculations and structured workflows.

The project represents **Step 1** of a larger system and is intended for validation, internal testing, and future extension.

---

## Live Demo
https://lh-1-phi.vercel.app

---

## Purpose

- Replace manual quotation creation (Word / Excel / PDF)
- Standardize pricing, taxes, and formatting
- Improve internal efficiency and traceability
- Prepare the foundation for a future backend system

---

## Key Features

### Quotation Creation
- Auto-generated quotation reference numbers (year-based)
- Client / sponsor information management
- Dynamic quotation line items
- Add / remove tests in real time
- Automatic subtotal calculation per line

### Pricing & Tax Logic
- Country selection (Canada / Other)
- Province-based tax calculation (QC, ON, BC, etc.)
- Automatic GST / QST / HST handling
- Discount percentage with validation
- Prevention of negative totals

### Internal Workflow
- Draft vs Client-ready preview modes
- Dirty state indicator (unsaved changes)
- Required field validation (Sponsor)
- Structured quotation history

### History Management
- Save unlimited quotations (local storage)
- Full quotation history
- Search by sponsor or reference number
- Filter by date range
- Duplicate quotations with new auto reference
- Rename quotation references
- Delete individual records or clear history

### Export & Backup
- PDF export (no print dialog)
- Automatic PDF naming using sponsor + reference
- Clean print/PDF layout with page breaks
- Export all data as JSON (backup)
- Import JSON backups to restore history

### Client Acceptance
- Sponsor name auto-filled in acceptance section
- Ready-to-sign PDF output
- Professional legal and payment terms included

---

## Technical Details

### Frontend
- React
- Vite
- JavaScript
- CSS (custom design system)

### Libraries
- `html2pdf.js` for PDF generation
- Browser Local Storage for persistence

---

## Application Structure

