import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';

@Controller()
export class AppController {
  @Get('obrigado')
  obrigado(@Res() res: Response) {
    res.send(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Obrigado! - Gabriel & Jessica</title>
          <style>
              body {
                  font-family: 'Montserrat', sans-serif;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  min-height: 100vh;
                  margin: 0;
                  background: linear-gradient(135deg, #c9a86c 0%, #b8975b 100%);
                  color: white;
                  text-align: center;
                  padding: 20px;
              }
              .container {
                  max-width: 600px;
              }
              h1 {
                  font-size: 3rem;
                  margin-bottom: 20px;
              }
              p {
                  font-size: 1.2rem;
                  margin-bottom: 30px;
              }
              a {
                  display: inline-block;
                  padding: 15px 40px;
                  background: white;
                  color: #c9a86c;
                  text-decoration: none;
                  border-radius: 50px;
                  font-weight: 600;
                  transition: transform 0.3s ease;
              }
              a:hover {
                  transform: scale(1.05);
              }
          </style>
      </head>
      <body>
          <div class="container">
              <h1>Muito Obrigado!</h1>
              <p>Seu presente significa muito para nós. Mal podemos esperar para compartilhar este dia especial com você!</p>
              <p>Você receberá uma confirmação do pagamento por e-mail em breve.</p>
              <a href="/">Voltar ao Site</a>
          </div>
      </body>
      </html>
    `);
  }
}
