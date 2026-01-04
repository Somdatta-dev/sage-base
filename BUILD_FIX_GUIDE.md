# Build Fix Guide

## Issue
The Docker build is failing because the new components use shadcn/ui style components that don't exist in the project.

## Quick Fix

The project has its own Button and Input components. Update all new components to use native HTML elements or the existing components.

### Changes Needed

1. **PublishButton.tsx** - ✅ FIXED
   - Changed to use existing Button component
   - Replaced Textarea/Label with native HTML

2. **PageSettingsModal.tsx** - NEEDS FIX
   - Remove RadioGroup import
   - Use native radio inputs

3. **UpdateRequestModal.tsx** - NEEDS FIX
   - Use existing Input component
   - Remove Textarea/Label imports

4. **UpdateRequestList.tsx** - NEEDS FIX
   - Remove Badge, ScrollArea imports
   - Use native HTML

5. **DiffViewer.tsx** - NEEDS FIX
   - Remove Badge, ScrollArea imports
   - Use native HTML

6. **VersionHistoryModal.tsx** - NEEDS FIX
   - Remove Badge import
   - Use native badge styling

## Alternative: Install Missing Dependencies

If you prefer to keep the shadcn/ui components, add to package.json:

```bash
npm install @radix-ui/react-dialog @radix-ui/react-label @radix-ui/react-radio-group @radix-ui/react-scroll-area @radix-ui/react-slot class-variance-authority
```

## Recommended: Use Native HTML

Replace all shadcn/ui components with native HTML for simplicity and consistency with existing code.

## Status

- PublishButton: ✅ Fixed
- PageSettingsModal: ⏳ Pending
- UpdateRequestModal: ⏳ Pending
- UpdateRequestList: ⏳ Pending
- DiffViewer: ⏳ Pending
- VersionHistoryModal: ⏳ Pending
