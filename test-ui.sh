echo "Checking #facc15 usage..."
grep -r "#facc15" apps/droid/src/app/page.tsx | wc -l

echo "Checking arbitrary sizing like w-[...px] h-[...px] p-[...px]"
grep -rE "w-\[[0-9]+px\]|h-\[[0-9]+px\]|p-\[[0-9]+px\]" apps/droid/src/app/page.tsx | wc -l
