import requests
import os
import json

# api_token = 'sk-2K8T680cc0ccdc1bb10029' # csulb email google acc
# api_token = 'sk-mbyx680ccd4567a5f10031' # 1414

# for i in range(340):
    
#     if os.path.exists(f"data/plant_{i + 1}.json"):
#         continue
    
#     print(f'getting {i + 1}')
#     resp = requests.get(f'https://perenual.com/api/v2/species-list?key={api_token}&page={i + 1}')
    
#     if resp.status_code == 200:
#         with open(f"data/plant_{i + 1}.json", "w") as f:
#             f.write(resp.text)
#     else:
#         print(resp.text)
#         break


for file_name in os.listdir('data'):
    data = json.load(open(f'data/{file_name}'))
    all_data = []
    
    for plant_json in data['data']:

        if plant_json['default_image'] != None and 'upgrade_access' not in plant_json['default_image']['original_url']:
            img_url = plant_json['default_image']['original_url']
        else:
            img_url = None

        new_jso = {
            'id': plant_json['id'],
            'name': plant_json['common_name'],
            'image_url': img_url,
            'scientific_name': plant_json['scientific_name'][0],
            'family': plant_json['family']
        }
        
        all_data.append(new_jso)

    with open(f'data/{file_name}', 'w') as f:
        json.dump(all_data, f, indent=4)
# all_data.sort(key=lambda x: x['name'])

