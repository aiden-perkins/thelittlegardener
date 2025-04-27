from google import genai

client = genai.Client(api_key="AIzaSyCYcsOY8m0OV0avMIrQY9LUrHrFsiOzO44")
myfile = client.files.upload(file='../assets/all_plants.json')
print(f"{myfile=}")

