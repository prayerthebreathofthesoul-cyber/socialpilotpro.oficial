<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  <div className="space-y-2">
    <Label htmlFor="documentType">Tipo de Cadastro</Label>
    <select
      id="documentType"
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      value={formData.documentType}
      onChange={(event) =>
        setFormData((prev) => ({
          ...prev,
          documentType: event.target.value as DocumentType,
        }))
      }
    >
      <option value="cnpj">Pessoa Jurídica - CNPJ</option>
      <option value="cpf">Pessoa Física - CPF</option>
    </select>
  </div>

  <div className="space-y-2">
    <Label htmlFor="documentNumber">
      {formData.documentType === "cpf" ? "CPF" : "CNPJ"}
    </Label>
    <Input
      id="documentNumber"
      value={formData.documentNumber}
      onChange={(event) =>
        setFormData((prev) => ({
          ...prev,
          documentNumber: event.target.value,
        }))
      }
      placeholder={
        formData.documentType === "cpf"
          ? "000.000.000-00"
          : "00.000.000/0000-00"
      }
    />
  </div>
</div>
