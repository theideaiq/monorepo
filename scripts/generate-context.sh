#!/bin/bash

# Define the output file
OUTPUT_FILE="context.txt"

# Clear the output file if it exists
> "$OUTPUT_FILE"

# Loop through all markdown files in the .jules/ directory
for file in .jules/*.md; do
  # Check if the file exists (in case the directory is empty or no md files found)
  if [ -e "$file" ]; then
    echo "Processing $file..."

    # Add a header for the file content
    echo "=== START OF $file ===" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"

    # Append the file content
    cat "$file" >> "$OUTPUT_FILE"

    # Add a footer/separator
    echo "" >> "$OUTPUT_FILE"
    echo "=== END OF $file ===" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    echo "----------------------------------------" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
  fi
done

echo "Context generated in $OUTPUT_FILE"
