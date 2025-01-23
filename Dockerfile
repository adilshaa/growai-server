FROM node:16

# Install Python
RUN apt-get update && apt-get install -y python3 python3-pip

# Create app directory
WORKDIR /usr/src/app

# Copy package.json and requirements.txt
COPY package*.json ./
COPY requirements.txt ./

# Install dependencies
RUN npm install
RUN pip3 install -r requirements.txt

# Bundle app source
COPY . .

# Expose ports
EXPOSE 3000
EXPOSE 5000

# Start command
CMD [ "node", "index.js" ]