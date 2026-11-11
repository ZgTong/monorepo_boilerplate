variable "owner" {
  type        = string
  description = "GitHub account that owns the repository."
  default     = "ZgTong"
}

variable "repository" {
  type        = string
  description = "Name of the repository whose settings this stack manages."
  default     = "monorepo_boilerplate"
}
