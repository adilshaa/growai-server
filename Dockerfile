FROM node:18-slim

# Install Python and build dependencies
RUN apt-get update && \
    apt-get install -y python3 python3-pip python3-venv python3-dev build-essential && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Create and activate virtual environment
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy dependency files
COPY package*.json requirements.txt ./

# Install Node dependencies
RUN npm install

# Install Python dependencies in virtual environment
RUN . /opt/venv/bin/activate && pip install --no-cache-dir -r requirements.txt

# Bundle app source
COPY . .

# Expose ports
EXPOSE 3000 5500

# Copy and set up start script
COPY start.sh /
RUN chmod +x /start.sh
CMD ["/start.sh"]