# Bulk Question Upload Templates

## Overview
This directory contains templates for bulk uploading questions to the Adaptive Quiz System.

## Template Files

### 1. question_upload_template.csv
- **Format**: Comma-separated values (CSV)
- **Use for**: Simple bulk uploads
- **Best for**: Up to 100 questions

### 2. question_upload_template.xlsx
- **Format**: Microsoft Excel with data validation
- **Use for**: Uploads with guided input
- **Best for**: Any number of questions

## Upload Methods

### Method 1: CSV/Excel Only (No Images)
1. Fill out template
2. Go to Admin → Questions → Bulk Upload
3. Upload your file

### Method 2: ZIP Upload (With Images)
1. Fill out template with image_filename column
2. Create `images/` folder with your image files
3. Create ZIP:
   ```
   questions_upload.zip
   ├── questions.csv (or .xlsx)
   └── images/
       ├── question_001.png
       └── question_002.jpg
   ```
4. Upload ZIP file

## Template Fields

| Field | Required | Description |
|-------|----------|-------------|
| question_text | ✅ | Full question text |
| topic_name | ✅ | Must match existing topic |
| option_1 to option_4 | ✅ | Answer choices |
| option_5 | ❌ | Fifth option (optional) |
| correct_option | ✅ | Number 1-5 |
| explanation | ✅ | Detailed explanation |
| bloom_taxonomy | ❌ | Remember, Understand, Apply, Analyze, Evaluate, Create |
| tags | ❌ | Comma-separated (e.g., "baseline,beginner-friendly") |
| image_filename | ❌ | Image reference (e.g., "question_001.png") |

## Bloom's Taxonomy Levels
- **Remember**: Recall facts and basic concepts
- **Understand**: Explain ideas or concepts
- **Apply**: Use information in new situations
- **Analyze**: Draw connections among ideas
- **Evaluate**: Justify a decision
- **Create**: Produce new or original work

## Common Tags
- `baseline`: For baseline assessment questions
- `beginner-friendly`: Suitable for beginners
- `advanced`: Advanced level questions
- `conceptual`: Tests conceptual understanding
- `practical`: Practical application
- `tricky`: Questions with common pitfalls

Check Admin → Tags for complete list.

## Best Practices

1. **Topic Names**: Must match exactly (case-sensitive)
2. **Options**: Provide at least 4 options
3. **Explanations**: Be thorough but concise
4. **Images**: PNG, JPG, JPEG, GIF (under 2MB)
5. **Tags**: Use lowercase, hyphenated format

## Support
- Admin Dashboard: http://localhost:3000/admin
- Documentation: /docs/USER_GUIDE.md

---
Template Version: 1.0 | Last Updated: 2025-11-26
