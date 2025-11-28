# Baseline Assessment Enhancement Features

This document describes the new features added to support enhanced baseline assessment functionality.

## Features Implemented

### 1. **Dynamic Question Options (4 or 5)**
- ✅ System now supports both 4-option and 5-option questions
- ✅ Database schema uses flexible one-to-many relationship
- ✅ UI dynamically renders any number of options
- ✅ Admin interface allows selecting 4 or 5 options when creating/editing questions
- ✅ Validation ensures exactly 1 correct answer

### 2. **Image Support for Questions**
- ✅ Questions can now include images (JPG, PNG, WebP format)
- ✅ Uses Vercel Blob Storage for reliable cloud hosting
- ✅ Drag-and-drop upload interface in admin panel
- ✅ Images display in quiz UI with responsive sizing
- ✅ Maximum file size: 5MB
- ✅ Automatic image optimization via Next.js Image component

### 3. **Baseline Timer - Elapsed Time**
- ✅ Baseline assessment uses elapsed time (stopwatch mode)
- ✅ No time limit for baseline quizzes
- ✅ Timer confirmed to work correctly (already implemented)

### 4. **Admin Question Management System**
- ✅ Complete CRUD interface for managing questions
- ✅ List view with filters (by topic, status, search)
- ✅ Create new questions with image upload
- ✅ Edit existing questions
- ✅ Delete questions (with image cleanup)
- ✅ Preview question images in list view

## Setup Instructions

### 1. **Install Dependencies**
```bash
npm install @vercel/blob
```

### 2. **Configure Vercel Blob Storage**

#### Get Vercel Blob Token:
1. Go to Vercel Dashboard: https://vercel.com/dashboard
2. Select your project
3. Navigate to **Storage** tab
4. Click **Create** → **Blob Store**
5. Copy the `BLOB_READ_WRITE_TOKEN`

#### Add to Environment Variables:
Create or update `.env.local`:
```bash
BLOB_READ_WRITE_TOKEN="your-vercel-blob-token-here"
```

### 3. **Database Migration**
The database schema has been updated to include `imageUrl` field:

```bash
# Already applied if you pulled latest code
npx prisma db push
npm run db:seed
```

### 4. **Start Development Server**
```bash
npm run dev
```

## Usage Guide

### For Instructors/Admins

#### Creating Questions with Images:

1. Navigate to **Admin Panel** → **Questions**
2. Click **"Create Question"**
3. Fill in question details:
   - Question text
   - Optional: Upload image (drag-and-drop or click to browse)
   - Select topic
   - Choose 4 or 5 options
   - Enter option text
   - Mark the correct answer (radio button)
   - Add explanation (optional)
4. Click **"Create Question"**

#### Editing Questions:

1. Go to **Admin Panel** → **Questions**
2. Find the question you want to edit
3. Click the **Edit** button (pencil icon)
4. Modify any fields including:
   - Changing 4 to 5 options (or vice versa)
   - Uploading/replacing images
   - Updating question text
5. Click **"Update Question"**

#### Filtering Questions:

- **By Topic**: Select from dropdown
- **By Status**: Active/Inactive
- **Search**: Type question text to search

### For Students

Questions with images will automatically display during quizzes:
- Image appears below the question text
- Responsive sizing for all devices
- Images load with proper optimization

## File Structure

### New Files Created:
```
src/
├── app/
│   ├── admin/
│   │   └── questions/
│   │       ├── page.tsx              # Questions list
│   │       ├── new/
│   │       │   └── page.tsx          # Create question
│   │       └── [id]/
│   │           └── edit/
│   │               └── page.tsx       # Edit question
│   └── api/
│       └── admin/
│           └── questions/
│               ├── route.ts           # List/Create API
│               ├── [id]/
│               │   └── route.ts       # Get/Update/Delete API
│               └── upload-image/
│                   └── route.ts       # Image upload API
├── components/
│   └── ui/
│       ├── textarea.tsx              # Added
│       └── table.tsx                 # Added
└── ...
```

### Modified Files:
- `prisma/schema.prisma` - Added `imageUrl` field to Question model
- `next.config.ts` - Added Vercel Blob domain for Next.js Image
- `.env.example` - Added BLOB_READ_WRITE_TOKEN documentation
- `src/app/quiz/[quizId]/page.tsx` - Added image display in quiz UI

## API Endpoints

### Question Management:
- `GET /api/admin/questions` - List questions (with filters)
- `POST /api/admin/questions` - Create new question
- `GET /api/admin/questions/[id]` - Get single question
- `PATCH /api/admin/questions/[id]` - Update question
- `DELETE /api/admin/questions/[id]` - Delete question

### Image Upload:
- `POST /api/admin/questions/upload-image` - Upload question image

## Validation Rules

### Question Validation:
- ✅ Question text required
- ✅ Topic selection required
- ✅ Must have 4 or 5 options
- ✅ All options must have text
- ✅ Exactly 1 correct answer required

### Image Validation:
- ✅ Allowed formats: JPG, JPEG, PNG, WebP
- ✅ Maximum size: 5MB
- ✅ Validated on both client and server

## Security

- ✅ All admin routes require authentication
- ✅ Role-based access control (admin only)
- ✅ File upload validation
- ✅ Secure image storage on Vercel Blob
- ✅ Automatic image cleanup on question deletion

## Performance Considerations

- ✅ Next.js Image component for automatic optimization
- ✅ Responsive image loading with proper `sizes` attribute
- ✅ CDN delivery via Vercel Blob
- ✅ Lazy loading for images in quiz UI

## Future Enhancements (Optional - Not Yet Implemented)

### "I Don't Know" Button:
- Separate button for students to indicate uncertainty
- Track skip rate vs incorrect answers
- Could treat differently in IRT ability estimates
- Implementation ready - just needs activation

### Excel/Docx Import Tool:
- Bulk import questions from instructor files
- Parse structured Excel/Word documents
- Automated image extraction and upload
- Validation reports

## Troubleshooting

### Image Upload Fails:
- Check `BLOB_READ_WRITE_TOKEN` is set correctly
- Verify Vercel Blob Store is created
- Check file size (must be ≤5MB)
- Ensure file format is JPG/PNG/WebP

### Images Don't Display:
- Check `next.config.ts` has Vercel Blob domain configured
- Verify `imageUrl` field exists in database
- Check browser console for errors

### Permission Errors:
- Ensure user has admin role
- Check authentication is working
- Verify session is active

## Testing Checklist

- [x] Create 4-option question without image
- [x] Create 5-option question without image
- [x] Create 4-option question with image
- [x] Create 5-option question with image
- [x] Edit question and change from 4 to 5 options
- [x] Edit question and replace image
- [x] Delete question (verify image cleanup)
- [x] Display questions with images in quiz UI
- [x] Test on mobile (responsive images)
- [x] Filter and search questions
- [x] Verify baseline timer shows elapsed time

## Support

For questions or issues, please check:
1. Environment variables are configured correctly
2. Database migrations have been applied
3. Vercel Blob Store is properly set up
4. User has appropriate permissions

---

**Implementation Complete**: All planned features for baseline assessment enhancement have been successfully implemented and tested.
