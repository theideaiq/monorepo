with open('.github/labeler.yml', 'r') as f:
    content = f.read()

content = content.replace('area: web:', '"area: web":')
content = content.replace('area: admin:', '"area: admin":')
content = content.replace('area: droid:', '"area: droid":')
content = content.replace('area: core:', '"area: core":')
content = content.replace('area: ops:', '"area: ops":')

with open('.github/labeler.yml', 'w') as f:
    f.write(content)
