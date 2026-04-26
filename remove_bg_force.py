from PIL import Image
import sys

def remove_bg(img_path):
    img = Image.open(img_path).convert("RGBA")
    datas = img.getdata()
    
    # Let's find the most common color in the border pixels
    width, height = img.size
    
    bg_color = img.getpixel((0,0))
    print("Background color identified as:", bg_color)
    
    newData = []
    # Using a larger threshold because jpeg/png compression makes flat colors variable
    threshold = 60
    for item in datas:
        # Check if the pixel is close to the background color
        if abs(item[0] - bg_color[0]) < threshold and \
           abs(item[1] - bg_color[1]) < threshold and \
           abs(item[2] - bg_color[2]) < threshold:
            # Replace with transparent
            newData.append((255, 255, 255, 0))
        else:
            newData.append(item)
            
    img.putdata(newData)
    # Save a fresh copy with a cache-busting name or just overwrite
    img.save(img_path, "PNG")
    print("Background removed successfully.")

remove_bg(sys.argv[1])
