var Boleto = require('node-boleto').Boleto;

var modBoleto = {};
 
modBoleto.createBoleto = function (params, callback) {
	var boleto = new Boleto({
	  'banco': "santander", // nome do banco dentro da pasta 'banks' 
	  'data_emissao': new Date(),
	  'data_vencimento': new Date(new Date().getTime() + 5 * 24 * 3600 * 1000), // 5 dias futuramente 
	  'valor': 150000, // R$ 15,00 (valor em centavos) 
	  'nosso_numero': "1234567",
	  'numero_documento': "123123",
	  'cedente': "IBM Blue Ninjas",
	  'cedente_cnpj': "18727053000174", // sem pontos e traços 
	  'agencia': "3978",
	  'codigo_cedente': "6404154", // PSK (código da carteira) 
	  'carteira': "102",
	  'pagador': "CPF: " + params.cpf,
	  'local_de_pagamento': "PAGÁVEL EM CAFE PARA QUALQUER NINJA ESPECIALMENTE O LEAL ATE O VENCIMENTO.",
      'instrucoes': "Sr. Caixa, não aceitar o café que não seja Nespresso.",
	});
	
	console.log("Linha digitável: " + boleto['linha_digitavel']);
	
	boleto.renderHTML(function(html){
	  callback(null,html);
	});	
}

modBoleto.generateFBResponse = function (linkurl,subtitle) {
	var elements = [{
		title: "Emissão de Segunda via de Boleto",
		item_url: linkurl,
		image_url: "https://aceitafacil.com/blog/wp-content/uploads/2016/05/cards-boleto.png",
		subtitle:subtitle
	}];
	return elements;
}

module.exports = modBoleto;