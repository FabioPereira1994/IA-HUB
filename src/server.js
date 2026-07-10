const app = require('./app');
const env = require('./config/env');

app.listen(env.PORT, () => {
  console.log(`AI Customer Hub API rodando em http://localhost:${env.PORT}`);
});
