<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  <div className="space-y-2">
    <Label htmlFor="documentType">Tipo de Cadastro</Label>
    <select
      id="documentType"
      className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground cursor-not-allowed"
      value={formData.documentType}
      disabled
    >
      <option value="cnpj">Pessoa Jurídica - CNPJ</option>
      <option value="cpf">Pessoa Física - CPF</option>
    </select>
    <p className="text-xs text-muted-foreground">
      Este dado não pode ser alterado pelo usuário. Para corrigir, entre em contato com o suporte.
    </p>
  </div>

  <div className="space-y-2">
    <Label htmlFor="documentNumber">
      {formData.documentType === "cpf" ? "CPF" : "CNPJ"}
    </Label>
    <Input
      id="documentNumber"
      value={formData.documentNumber}
      disabled
      className="bg-muted text-muted-foreground cursor-not-allowed"
      placeholder={
        formData.documentType === "cpf"
          ? "000.000.000-00"
          : "00.000.000/0000-00"
      }
    />
    <p className="text-xs text-muted-foreground">
      Documento bloqueado por segurança.
    </p>
  </div>
</div>
