package validator

import (
	"fmt"
	"reflect"
	"regexp"
	"strings"
)

var slugRegex = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)

type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

type ValidationErrors []ValidationError

func (v ValidationErrors) Error() string {
	parts := make([]string, len(v))
	for i, e := range v {
		parts[i] = fmt.Sprintf("%s: %s", e.Field, e.Message)
	}
	return strings.Join(parts, "; ")
}

func Validate(s interface{}) ValidationErrors {
	var errs ValidationErrors
	v := reflect.ValueOf(s)
	if v.Kind() == reflect.Ptr {
		v = v.Elem()
	}
	if v.Kind() != reflect.Struct {
		return nil
	}

	t := v.Type()
	for i := 0; i < v.NumField(); i++ {
		field := t.Field(i)
		tag := field.Tag.Get("validate")
		if tag == "" {
			continue
		}

		fieldValue := v.Field(i)
		fieldName := field.Tag.Get("json")
		if fieldName == "" {
			fieldName = field.Name
		} else {
			fieldName = strings.Split(fieldName, ",")[0]
		}

		rules := strings.Split(tag, ",")
		for _, rule := range rules {
			if err := applyRule(fieldName, fieldValue, rule); err != nil {
				errs = append(errs, *err)
				break
			}
		}
	}

	return errs
}

func applyRule(name string, v reflect.Value, rule string) *ValidationError {
	parts := strings.SplitN(rule, "=", 2)
	ruleName := parts[0]
	var ruleVal string
	if len(parts) == 2 {
		ruleVal = parts[1]
	}

	switch ruleName {
	case "required":
		if isZero(v) {
			return &ValidationError{Field: name, Message: "wajib diisi"}
		}
	case "min":
		if v.Kind() == reflect.String {
			var n int
			fmt.Sscanf(ruleVal, "%d", &n)
			if len(v.String()) < n {
				return &ValidationError{Field: name, Message: fmt.Sprintf("minimal %d karakter", n)}
			}
		}
	case "max":
		if v.Kind() == reflect.String {
			var n int
			fmt.Sscanf(ruleVal, "%d", &n)
			if len(v.String()) > n {
				return &ValidationError{Field: name, Message: fmt.Sprintf("maksimal %d karakter", n)}
			}
		}
	case "oneof":
		if v.Kind() == reflect.String {
			options := strings.Split(ruleVal, " ")
			val := v.String()
			for _, o := range options {
				if val == o {
					return nil
				}
			}
			return &ValidationError{Field: name, Message: fmt.Sprintf("harus salah satu dari: %s", strings.Join(options, ", "))}
		}
	case "slug":
		if v.Kind() == reflect.String && v.String() != "" && !slugRegex.MatchString(v.String()) {
			return &ValidationError{Field: name, Message: "format slug tidak valid"}
		}
	case "email":
		if v.Kind() == reflect.String && v.String() != "" {
			if !strings.Contains(v.String(), "@") {
				return &ValidationError{Field: name, Message: "format email tidak valid"}
			}
		}
	}
	return nil
}

func isZero(v reflect.Value) bool {
	switch v.Kind() {
	case reflect.String:
		return v.String() == ""
	case reflect.Slice, reflect.Map, reflect.Array:
		return v.Len() == 0
	case reflect.Ptr, reflect.Interface:
		return v.IsNil()
	}
	return v.IsZero()
}

func Slugify(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	s = regexp.MustCompile(`[^a-z0-9]+`).ReplaceAllString(s, "-")
	s = strings.Trim(s, "-")
	return s
}
