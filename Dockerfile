FROM node:16-slim

# Install Python and build dependencies
RUN apt-get update && \
    apt-get install -y python3 python3-pip python3-dev build-essential && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Copy dependency files
COPY package*.json requirements.txt ./

# Install Node dependencies
RUN npm ci

# Install Python dependencies
RUN pip3 install --no-cache-dir -r requirements.txt

# Bundle app source
COPY . .

# Expose ports
EXPOSE 3000 5000

# Start command using a shell script
COPY start.sh /
RUN chmod +x /start.sh
CMD ["/start.sh"]