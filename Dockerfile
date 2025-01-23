FROM node:22.11.0 

# Install Python and build dependencies
RUN apt-get update && \
    apt-get install -y python3 python3-pip python3-dev build-essential && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Copy dependency files
COPY package*.json requirements.txt ./

# Install Node dependencies
RUN npm install

# Install Python dependencies
RUN pip3 install --no-cache-dir -r requirements.txt

# Bundle app source
COPY . .

# Expose ports
EXPOSE 3000 5000

# Copy and set up start script
COPY start.sh /
RUN chmod +x /start.sh
CMD ["/start.sh"]