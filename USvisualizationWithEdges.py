import pandas as pd
import matplotlib.pyplot as plt
from shapely.geometry import LineString
import geopandas as gpd

# Load the dataset
file_path = 'data/matched_checkin_locations_US.txt'  # Replace with your dataset file path
data = pd.read_csv(file_path, sep='\t', header=None, names=['user','check_in_time', 'latitude', 'longitude', 'country'])

# Step 1: Load the U.S. states shapefile
us_states = gpd.read_file("https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json")

# # Step 2: Filter for contiguous U.S. states (exclude Alaska, Hawaii, Puerto Rico)
# contiguous_states = us_states[~us_states['name'].isin(['Alaska', 'Hawaii', 'Puerto Rico'])]

# # Step 3: Filter your data for points within the contiguous U.S.
# # Assuming `data` is a DataFrame with 'latitude' and 'longitude'
# us_data = data[(data['longitude'] >= -125) & (data['longitude'] <= -66) &  # Longitude range
#                (data['latitude'] >= 24) & (data['latitude'] <= 49)]        # Latitude range

# Step 1: Filter US Users
us_users = data['user'].values  # Assuming `user_id` contains user indices
us_users_set = set(us_users)  # Convert to set for fast lookup

# Step 2: Load and Filter Edges
edges = pd.read_csv('data/Gowalla_edges.txt', sep='\t', header=None, names=['user1', 'user2'])

# Filter edges where both users are US users
us_edges = edges[edges['user1'].isin(us_users_set) & edges['user2'].isin(us_users_set)]

# Step 3: Create Mapping of User Indices to Coordinates
user_coords = data.set_index('user')[['longitude', 'latitude']].to_dict('index')

# Step 4: Plot US Map with Edges
fig, ax = plt.subplots(figsize=(12, 8))

# Plot state boundaries
us_states.boundary.plot(ax=ax, color='black', linewidth=1)

# Plot users
ax.scatter(
    data['longitude'],
    data['latitude'],
    color='blue',
    s=5,
    alpha=0.7
)

# Draw edges
for _, row in us_edges.iterrows():
    user1_coords = user_coords[row['user1']]
    user2_coords = user_coords[row['user2']]
    
    # Plot a line between the two users
    ax.plot(
        [user1_coords['longitude'], user2_coords['longitude']],
        [user1_coords['latitude'], user2_coords['latitude']],
        color='red',
        linewidth=0.3,
        alpha=0.5  # Optional transparency
    )

# # Set map extent for continental U.S.
# ax.set_xlim(-125, -66)
# ax.set_ylim(24, 50)

# Add titles and labels
plt.title('US User Network on Map with Edges', fontsize=16)
plt.xlabel('Longitude', fontsize=12)
plt.ylabel('Latitude', fontsize=12)
plt.grid(True, linestyle='--', alpha=0.5)

# Show plot
plt.show()
