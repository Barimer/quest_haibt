from PIL import Image, ImageDraw
import sys

def remove_bg(img_path):
    try:
        img = Image.open(img_path).convert("RGBA")
        
        # Create a mask for floodfill
        # Floodfill doesn't work directly on RGBA to make it transparent easily in one step
        # So we create a dummy image to floodfill
        
        # Background color at 0,0
        bg_color = img.getpixel((0,0))
        
        # threshold for color matching
        threshold = 30
        
        width, height = img.size
        pixels = img.load()
        
        # Basic BFS for flood fill from edges
        visited = set()
        queue = [(0,0), (width-1, 0), (0, height-1), (width-1, height-1)]
        
        for q in queue:
            visited.add(q)
            
        head = 0
        while head < len(queue):
            x, y = queue[head]
            head += 1
            
            p = pixels[x, y]
            if abs(p[0] - bg_color[0]) <= threshold and abs(p[1] - bg_color[1]) <= threshold and abs(p[2] - bg_color[2]) <= threshold:
                pixels[x, y] = (255, 255, 255, 0) # Transparent
                
                # Add neighbors
                for dx, dy in [(0,1), (1,0), (0,-1), (-1,0)]:
                    nx, ny = x+dx, y+dy
                    if 0 <= nx < width and 0 <= ny < height:
                        if (nx, ny) not in visited:
                            visited.add((nx, ny))
                            queue.append((nx, ny))

        img.save(img_path, "PNG")
        print("Success")
    except Exception as e:
        print(f"Error: {e}")

remove_bg(sys.argv[1])
