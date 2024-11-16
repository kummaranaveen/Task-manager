from django.contrib import admin
from .models import Task

@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'priority', 'status', 'due_date', 'created_at')
    list_filter = ('priority', 'status', 'due_date')
    search_fields = ('title', 'description', 'user__username')
    date_hierarchy = 'created_at'