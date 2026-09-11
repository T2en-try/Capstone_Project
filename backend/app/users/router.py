from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status  # type: ignore
from pydantic import BaseModel, ConfigDict, EmailStr, Field  # type: ignore
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.router import get_current_admin
from app.auth.utils import hash_password
from app.core.database import get_db
from app.reports.models import User, UserRole


router = APIRouter(
    prefix="/api/employees",
    tags=["Employees"],
)


# =========================================================
# Employee Create
# =========================================================

class EmployeeCreate(BaseModel):
    employee_code: str = Field(
        min_length=1,
        max_length=50
    )

    email: EmailStr

    password: str = Field(
        min_length=8,
        max_length=128
    )

    first_name: str = Field(
        min_length=1,
        max_length=100
    )

    last_name: str = Field(
        min_length=1,
        max_length=100
    )

    phone: str | None = Field(
        default=None,
        max_length=30
    )

    department: str | None = Field(
        default=None,
        max_length=150
    )

    position: str | None = Field(
        default=None,
        max_length=150
    )

    role: UserRole = UserRole.OFFICER


# =========================================================
# Employee Update
# =========================================================

class EmployeeUpdate(BaseModel):
    employee_code: str | None = Field(
        default=None,
        min_length=1,
        max_length=50
    )

    email: EmailStr | None = None

    password: str | None = Field(
        default=None,
        min_length=8,
        max_length=128
    )

    first_name: str | None = Field(
        default=None,
        min_length=1,
        max_length=100
    )

    last_name: str | None = Field(
        default=None,
        min_length=1,
        max_length=100
    )

    phone: str | None = Field(
        default=None,
        max_length=30
    )

    department: str | None = Field(
        default=None,
        max_length=150
    )

    position: str | None = Field(
        default=None,
        max_length=150
    )

    role: UserRole | None = None

    is_active: int | None = Field(
        default=None,
        ge=0,
        le=1
    )


# =========================================================
# Employee Response
# =========================================================

class EmployeeResponse(BaseModel):
    id: int

    employee_code: str | None = None

    email: EmailStr

    first_name: str | None = None

    last_name: str | None = None

    phone: str | None = None

    department: str | None = None

    position: str | None = None

    role: UserRole

    is_active: int

    created_at: datetime

    last_login: datetime | None = None

    model_config = ConfigDict(
        from_attributes=True
    )


# =========================================================
# GET /api/employees
# List Employees
# =========================================================

@router.get(
    "",
    response_model=list[EmployeeResponse]
)
async def list_employees(
    _: object = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User)
        .order_by(User.created_at.desc())
    )

    return result.scalars().all()


# =========================================================
# POST /api/employees
# Create Employee
# =========================================================

@router.post(
    "",
    response_model=EmployeeResponse,
    status_code=status.HTTP_201_CREATED
)
async def create_employee(
    body: EmployeeCreate,
    _: object = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    employee = User(
        employee_code=body.employee_code.strip(),

        email=str(body.email).lower(),

        hashed_password=hash_password(
            body.password
        ),

        first_name=body.first_name.strip(),

        last_name=body.last_name.strip(),

        phone=body.phone.strip()
        if body.phone
        else None,

        department=body.department.strip()
        if body.department
        else None,

        position=body.position.strip()
        if body.position
        else None,

        role=body.role,

        is_active=1,
    )

    db.add(employee)

    try:
        await db.commit()
        await db.refresh(employee)

    except IntegrityError:
        await db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="รหัสพนักงานหรืออีเมลนี้มีอยู่ในระบบแล้ว"
        )

    return employee


# =========================================================
# PATCH /api/employees/{employee_id}
# Update Employee
# =========================================================

@router.patch(
    "/{employee_id}",
    response_model=EmployeeResponse
)
async def update_employee(
    employee_id: int,
    body: EmployeeUpdate,
    _: object = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User)
        .where(User.id == employee_id)
    )

    employee = result.scalar_one_or_none()

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ไม่พบพนักงานที่ต้องการแก้ไข"
        )

    # Employee Code
    if body.employee_code is not None:
        employee.employee_code = (
            body.employee_code.strip()
        )

    # Email
    if body.email is not None:
        employee.email = str(body.email).lower()

    # Password
    if body.password is not None:
        employee.hashed_password = hash_password(
            body.password
        )

    # First Name
    if body.first_name is not None:
        employee.first_name = (
            body.first_name.strip()
        )

    # Last Name
    if body.last_name is not None:
        employee.last_name = (
            body.last_name.strip()
        )

    # Phone
    if body.phone is not None:
        employee.phone = body.phone.strip()

    # Department
    if body.department is not None:
        employee.department = (
            body.department.strip()
        )

    # Position
    if body.position is not None:
        employee.position = (
            body.position.strip()
        )

    # Role
    if body.role is not None:
        employee.role = body.role

    # Active
    if body.is_active is not None:
        employee.is_active = body.is_active

    try:
        await db.commit()
        await db.refresh(employee)

    except IntegrityError:
        await db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="รหัสพนักงานหรืออีเมลนี้มีอยู่ในระบบแล้ว"
        )

    return employee


# =========================================================
# DELETE /api/employees/{employee_id}
# Delete Employee
# =========================================================

@router.delete(
    "/{employee_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
async def delete_employee(
    employee_id: int,
    _: object = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User)
        .where(User.id == employee_id)
    )

    employee = result.scalar_one_or_none()

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ไม่พบพนักงานที่ต้องการลบ"
        )

    await db.delete(employee)
    await db.commit()